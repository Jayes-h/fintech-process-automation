const StateConfig = require('../models/StateConfig');
const Brands = require('../models/Brands');
const SellerPortals = require('../models/SellerPortals');
const { Op } = require('sequelize');
const XLSX = require('xlsx');

/**
 * Get state config by brand and seller portal
 * GET /api/state-config/:brandId/:sellerPortalId
 */
exports.getStateConfig = async (req, res, next) => {
  try {
    const { brandId, sellerPortalId } = req.params;

    const stateConfig = await StateConfig.findOne({
      where: { brandId, sellerPortalId },
      include: [
        { model: Brands, as: 'brand', attributes: ['id', 'name'] },
        { model: SellerPortals, as: 'sellerPortal', attributes: ['id', 'name'] }
      ]
    });

    if (!stateConfig) {
      return res.status(404).json({
        success: false,
        message: 'State config not found'
      });
    }

    res.json({
      success: true,
      data: stateConfig
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all state configs for a brand
 * GET /api/state-config/brand/:brandId
 */
exports.getStateConfigsByBrand = async (req, res, next) => {
  try {
    const { brandId } = req.params;

    const stateConfigs = await StateConfig.findAll({
      where: { brandId },
      include: [
        { model: Brands, as: 'brand', attributes: ['id', 'name'] },
        { model: SellerPortals, as: 'sellerPortal', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: stateConfigs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create or update state config
 * POST /api/state-config
 */
exports.createOrUpdateStateConfig = async (req, res, next) => {
  try {
    const { brandId, sellerPortalId, configData } = req.body;

    if (!brandId || !sellerPortalId) {
      return res.status(400).json({
        success: false,
        message: 'Brand ID and Seller Portal ID are required'
      });
    }

    if (!configData || typeof configData !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Config data is required and must be an object'
      });
    }

    // Check if brand exists
    const brand = await Brands.findByPk(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Check if seller portal exists
    const sellerPortal = await SellerPortals.findByPk(sellerPortalId);
    if (!sellerPortal) {
      return res.status(404).json({
        success: false,
        message: 'Seller portal not found'
      });
    }

    // Find existing config or create new one
    const [stateConfig, created] = await StateConfig.findOrCreate({
      where: { brandId, sellerPortalId },
      defaults: {
        brandId,
        sellerPortalId,
        configData
      }
    });

    if (!created) {
      // Update existing config
      await stateConfig.update({ configData });
    }

    res.json({
      success: true,
      data: stateConfig,
      message: created ? 'State config created successfully' : 'State config updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update state config
 * PUT /api/state-config/:id
 */
exports.updateStateConfig = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { configData } = req.body;

    if (!configData || typeof configData !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Config data is required and must be an object'
      });
    }

    const stateConfig = await StateConfig.findByPk(id);

    if (!stateConfig) {
      return res.status(404).json({
        success: false,
        message: 'State config not found'
      });
    }

    await stateConfig.update({ configData });

    res.json({
      success: true,
      data: stateConfig,
      message: 'State config updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete state config
 * DELETE /api/state-config/:id
 */
exports.deleteStateConfig = async (req, res, next) => {
  try {
    const { id } = req.params;

    const stateConfig = await StateConfig.findByPk(id);

    if (!stateConfig) {
      return res.status(404).json({
        success: false,
        message: 'State config not found'
      });
    }

    await stateConfig.destroy();

    res.json({
      success: true,
      message: 'State config deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload state config file
 * POST /api/state-config/upload/:brandId/:sellerPortalId
 * Expected Excel headers: States, Amazon Pay Ledger, Invoice No.
 */
exports.uploadStateConfigFile = async (req, res, next) => {
  try {
    const { brandId, sellerPortalId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Check if brand exists
    const brand = await Brands.findByPk(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Check if seller portal exists
    const sellerPortal = await SellerPortals.findByPk(sellerPortalId);
    if (!sellerPortal) {
      return res.status(404).json({
        success: false,
        message: 'Seller portal not found'
      });
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      return res.status(400).json({
        success: false,
        message: 'No worksheet found in Excel file'
      });
    }

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    if (!jsonData || jsonData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty or has no data rows'
      });
    }

    // Expected headers
    const expectedHeaders = ['States', 'Amazon Pay Ledger', 'Invoice No.'];
    
    // Get headers from first row
    const firstRow = jsonData[0];
    const headers = Object.keys(firstRow);
    
    // Normalize headers (case-insensitive, trim whitespace)
    const normalizedHeaders = headers.map(h => h.trim());
    const normalizedExpected = expectedHeaders.map(h => h.trim());
    
    // Check if all expected headers are present
    const missingHeaders = normalizedExpected.filter(expected => 
      !normalizedHeaders.some(header => 
        header.toLowerCase() === expected.toLowerCase()
      )
    );

    if (missingHeaders.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required headers: ${missingHeaders.join(', ')}. Found headers: ${headers.join(', ')}`
      });
    }

    // Map headers to normalized keys
    const headerMap = {};
    normalizedExpected.forEach(expected => {
      const foundHeader = normalizedHeaders.find(header => 
        header.toLowerCase() === expected.toLowerCase()
      );
      if (foundHeader) {
        headerMap[foundHeader] = expected;
      }
    });

    // Transform data to match expected format
    const configData = {
      states: jsonData.map(row => {
        const stateRow = {};
        normalizedExpected.forEach(expected => {
          const originalHeader = Object.keys(headerMap).find(h => headerMap[h] === expected);
          if (originalHeader) {
            stateRow[expected] = row[originalHeader] || null;
          }
        });
        return stateRow;
      })
    };

    // Find existing config or create new one
    const [stateConfig, created] = await StateConfig.findOrCreate({
      where: { brandId, sellerPortalId },
      defaults: {
        brandId,
        sellerPortalId,
        configData
      }
    });

    if (!created) {
      // Update existing config
      await stateConfig.update({ configData });
    }

    res.json({
      success: true,
      data: stateConfig,
      message: created ? 'State config created successfully from file' : 'State config updated successfully from file',
      parsedRows: jsonData.length
    });
  } catch (error) {
    next(error);
  }
};

