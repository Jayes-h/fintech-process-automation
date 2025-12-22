const SKU = require('../models/SKU');
const Brands = require('../models/Brands');
const SellerPortals = require('../models/SellerPortals');
const { Op } = require('sequelize');
const XLSX = require('xlsx-js-style');

/**
 * Get all SKUs
 * GET /api/sku
 */
exports.getAllSKUs = async (req, res, next) => {
  try {
    const { brandId, salesPortalId } = req.query;
    const where = {};
    
    if (brandId) {
      where.brandId = brandId;
    }
    if (salesPortalId) {
      where.salesPortalId = salesPortalId;
    }

    const skus = await SKU.findAll({
      where,
      include: [
        { model: Brands, as: 'brand', attributes: ['id', 'name'] },
        { model: SellerPortals, as: 'salesPortal', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: skus
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get SKU by ID
 * GET /api/sku/:id
 */
exports.getSKUById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sku = await SKU.findByPk(id, {
      include: [
        { model: Brands, as: 'brand', attributes: ['id', 'name'] },
        { model: SellerPortals, as: 'salesPortal', attributes: ['id', 'name'] }
      ]
    });

    if (!sku) {
      return res.status(404).json({
        success: false,
        message: 'SKU not found'
      });
    }

    res.json({
      success: true,
      data: sku
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get SKUs by brand
 * GET /api/sku/brand/:brandId
 */
exports.getSKUsByBrand = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const skus = await SKU.findAll({
      where: { brandId },
      include: [
        { model: Brands, as: 'brand', attributes: ['id', 'name'] },
        { model: SellerPortals, as: 'salesPortal', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: skus
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new SKU
 * POST /api/sku
 */
exports.createSKU = async (req, res, next) => {
  try {
    const { brandId, salesPortalId, salesPortalSku, tallyNewSku } = req.body;

    if (!brandId) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID is required'
      });
    }

    if (!salesPortalId) {
      return res.status(400).json({
        success: false,
        message: 'Sales portal ID is required'
      });
    }

    if (!salesPortalSku || !salesPortalSku.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Sales portal SKU is required'
      });
    }

    if (!tallyNewSku || !tallyNewSku.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tally new SKU is required'
      });
    }

    // Validate brand exists
    const brand = await Brands.findByPk(brandId);
    if (!brand) {
      return res.status(400).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Validate sales portal exists
    const salesPortal = await SellerPortals.findByPk(salesPortalId);
    if (!salesPortal) {
      return res.status(400).json({
        success: false,
        message: 'Sales portal not found'
      });
    }

    // Check if SKU already exists for this brand and sales portal
    const existingSKU = await SKU.findOne({
      where: {
        brandId,
        salesPortalId,
        salesPortalSku: { [Op.iLike]: salesPortalSku.trim() }
      }
    });

    if (existingSKU) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists for this brand and sales portal'
      });
    }

    const sku = await SKU.create({
      brandId,
      salesPortalId,
      salesPortalSku: salesPortalSku.trim(),
      tallyNewSku: tallyNewSku.trim()
    });

    const skuWithRelations = await SKU.findByPk(sku.id, {
      include: [
        { model: Brands, as: 'brand', attributes: ['id', 'name'] },
        { model: SellerPortals, as: 'salesPortal', attributes: ['id', 'name'] }
      ]
    });

    res.status(201).json({
      success: true,
      data: skuWithRelations
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists for this brand and sales portal'
      });
    }
    next(error);
  }
};

/**
 * Update SKU
 * PUT /api/sku/:id
 */
exports.updateSKU = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { brandId, salesPortalId, salesPortalSku, tallyNewSku } = req.body;

    const sku = await SKU.findByPk(id);

    if (!sku) {
      return res.status(404).json({
        success: false,
        message: 'SKU not found'
      });
    }

    if (salesPortalSku !== undefined && !salesPortalSku.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Sales portal SKU is required'
      });
    }

    if (tallyNewSku !== undefined && !tallyNewSku.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tally new SKU is required'
      });
    }

    // Check if another SKU with same salesPortalSku exists for this brand and sales portal
    if (salesPortalSku) {
      const existingSKU = await SKU.findOne({
        where: {
          salesPortalSku: { [Op.iLike]: salesPortalSku.trim() },
          brandId: brandId || sku.brandId,
          salesPortalId: salesPortalId || sku.salesPortalId,
          id: { [Op.ne]: id }
        }
      });

      if (existingSKU) {
        return res.status(400).json({
          success: false,
          message: 'SKU already exists for this brand and sales portal'
        });
      }
    }

    await sku.update({
      brandId: brandId || sku.brandId,
      salesPortalId: salesPortalId || sku.salesPortalId,
      salesPortalSku: salesPortalSku ? salesPortalSku.trim() : sku.salesPortalSku,
      tallyNewSku: tallyNewSku ? tallyNewSku.trim() : sku.tallyNewSku
    });

    const updatedSKU = await SKU.findByPk(sku.id, {
      include: [
        { model: Brands, as: 'brand', attributes: ['id', 'name'] },
        { model: SellerPortals, as: 'salesPortal', attributes: ['id', 'name'] }
      ]
    });

    res.json({
      success: true,
      data: updatedSKU
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists for this brand and sales portal'
      });
    }
    next(error);
  }
};

/**
 * Delete SKU
 * DELETE /api/sku/:id
 */
exports.deleteSKU = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sku = await SKU.findByPk(id);

    if (!sku) {
      return res.status(404).json({
        success: false,
        message: 'SKU not found'
      });
    }

    await sku.destroy();

    res.json({
      success: true,
      message: 'SKU deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk create SKUs from Excel/JSON
 * POST /api/sku/bulk
 */
exports.bulkCreateSKUs = async (req, res, next) => {
  try {
    const { brandId, salesPortalId, skus } = req.body;

    if (!brandId || !salesPortalId || !Array.isArray(skus) || skus.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID, Sales Portal ID, and SKUs array are required'
      });
    }

    // Validate brand and sales portal exist
    const brand = await Brands.findByPk(brandId);
    if (!brand) {
      return res.status(400).json({
        success: false,
        message: 'Brand not found'
      });
    }

    const salesPortal = await SellerPortals.findByPk(salesPortalId);
    if (!salesPortal) {
      return res.status(400).json({
        success: false,
        message: 'Sales portal not found'
      });
    }

    const createdSKUs = [];
    const errors = [];

    for (const skuData of skus) {
      try {
        if (!skuData.salesPortalSku || !skuData.tallyNewSku) {
          errors.push({
            row: skuData,
            error: 'Sales portal SKU and Tally new SKU are required'
          });
          continue;
        }

        // Check if SKU already exists
        const existingSKU = await SKU.findOne({
          where: {
            brandId,
            salesPortalId,
            salesPortalSku: { [Op.iLike]: skuData.salesPortalSku.trim() }
          }
        });

        if (existingSKU) {
          // Update existing SKU
          await existingSKU.update({
            tallyNewSku: skuData.tallyNewSku.trim()
          });
          createdSKUs.push(existingSKU);
        } else {
          // Create new SKU
          const newSKU = await SKU.create({
            brandId,
            salesPortalId,
            salesPortalSku: skuData.salesPortalSku.trim(),
            tallyNewSku: skuData.tallyNewSku.trim()
          });
          createdSKUs.push(newSKU);
        }
      } catch (error) {
        errors.push({
          row: skuData,
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Created/Updated ${createdSKUs.length} SKUs`,
      data: {
        created: createdSKUs.length,
        errors: errors.length,
        errorDetails: errors
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload Excel file and create SKUs
 * POST /api/sku/upload
 */
exports.uploadSKUFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is required'
      });
    }

    const { brandId, salesPortalId } = req.body;

    if (!brandId) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID is required'
      });
    }

    if (!salesPortalId) {
      return res.status(400).json({
        success: false,
        message: 'Sales portal ID is required'
      });
    }

    // Validate brand and sales portal exist
    const brand = await Brands.findByPk(brandId);
    if (!brand) {
      return res.status(400).json({
        success: false,
        message: 'Brand not found'
      });
    }

    const salesPortal = await SellerPortals.findByPk(salesPortalId);
    if (!salesPortal) {
      return res.status(400).json({
        success: false,
        message: 'Sales portal not found'
      });
    }

    // Parse Excel file
    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: `Failed to read Excel file: ${error.message}`
      });
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file has no worksheets'
      });
    }

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty or has no data rows'
      });
    }

    // Find column headers (case-insensitive)
    const firstRow = jsonData[0];
    const headers = Object.keys(firstRow);
    
    // Find sales portal sku column (case-insensitive)
    let salesPortalSkuCol = null;
    let tallyNewSkuCol = null;

    for (const header of headers) {
      const headerLower = header.toLowerCase().trim();
      if (headerLower === 'sales portal sku' || headerLower === 'sales_portal_sku' || headerLower === 'salesportalsku') {
        salesPortalSkuCol = header;
      }
      if (headerLower === 'tally new sku' || headerLower === 'tally_new_sku' || headerLower === 'tallynewsku') {
        tallyNewSkuCol = header;
      }
    }

    if (!salesPortalSkuCol || !tallyNewSkuCol) {
      return res.status(400).json({
        success: false,
        message: 'Excel file must contain columns: "sales portal sku" and "tally new sku"'
      });
    }

    // Extract SKU data
    const skus = [];
    for (const row of jsonData) {
      const salesPortalSku = row[salesPortalSkuCol];
      const tallyNewSku = row[tallyNewSkuCol];

      if (salesPortalSku && tallyNewSku) {
        skus.push({
          salesPortalSku: String(salesPortalSku).trim(),
          tallyNewSku: String(tallyNewSku).trim()
        });
      }
    }

    if (skus.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid SKU data found in Excel file'
      });
    }

    // Bulk create SKUs
    const createdSKUs = [];
    const updatedSKUs = [];
    const newSKUs = [];
    const errors = [];

    for (const skuData of skus) {
      try {
        // Check if SKU already exists
        const existingSKU = await SKU.findOne({
          where: {
            brandId,
            salesPortalId,
            salesPortalSku: { [Op.iLike]: skuData.salesPortalSku }
          }
        });

        if (existingSKU) {
          // Update existing SKU
          const oldTallySku = existingSKU.tallyNewSku;
          await existingSKU.update({
            tallyNewSku: skuData.tallyNewSku
          });
          updatedSKUs.push(existingSKU);
          createdSKUs.push(existingSKU);
        } else {
          // Create new SKU
          const newSKU = await SKU.create({
            brandId,
            salesPortalId,
            salesPortalSku: skuData.salesPortalSku,
            tallyNewSku: skuData.tallyNewSku
          });
          newSKUs.push(newSKU);
          createdSKUs.push(newSKU);
        }
      } catch (error) {
        errors.push({
          salesPortalSku: skuData.salesPortalSku,
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Successfully processed ${createdSKUs.length} SKUs (${newSKUs.length} new, ${updatedSKUs.length} updated)`,
      data: {
        created: createdSKUs.length,
        new: newSKUs.length,
        updated: updatedSKUs.length,
        errors: errors.length,
        errorDetails: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    next(error);
  }
};

