const BlinkitSales = require('../models/BlinkitSales');
const StateConfig = require('../models/StateConfig');
const MacrosFiles = require('../models/MacrosFiles');
const Brands = require('../models/Brands');
const SellerPortals = require('../models/SellerPortals');
const SKU = require('../models/SKU');
const { processBlinkitMacros } = require('../modules/Macros/blinkit/macrosProcessorBlinkit');
const XLSX = require('xlsx-js-style');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Directory to store output files
const OUTPUT_DIR = path.join(__dirname, '../outputs/macros');

// Ensure directories exist
async function ensureDirectories() {
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating directories:', error);
  }
}

// Initialize directories on module load
ensureDirectories();

/**
 * Generate Blinkit macros - Upload raw file and process
 * POST /api/macros-blinkit/generate
 */
exports.generateMacros = async (req, res, next) => {
  try {
    console.log('=== BLINKIT MACROS GENERATE REQUEST ===');
    console.log('Body:', req.body);
    console.log('Files:', req.files ? Object.keys(req.files) : 'No files');
    
    if (!req.files || !req.files.rawFile) {
      return res.status(400).json({ 
        success: false, 
        message: 'Raw file is required' 
      });
    }

    const { brandId, sellerPortalId, date, withInventory } = req.body;

    if (!brandId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Brand ID is required' 
      });
    }

    if (!sellerPortalId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Seller portal ID is required' 
      });
    }

    if (!date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Date is required' 
      });
    }

    // Validate that brand and seller portal exist
    const brand = await Brands.findByPk(brandId);
    if (!brand) {
      return res.status(400).json({ 
        success: false, 
        message: 'Brand not found' 
      });
    }

    const sellerPortal = await SellerPortals.findByPk(sellerPortalId);
    if (!sellerPortal) {
      return res.status(400).json({ 
        success: false, 
        message: 'Seller portal not found' 
      });
    }

    const sellerPortalName = sellerPortal.name;

    const rawFile = req.files.rawFile[0];

    // Validate file buffer exists
    if (!rawFile.buffer || rawFile.buffer.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Raw file buffer is empty or corrupted' 
      });
    }

    // Validate file types (Excel and CSV)
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv',
      'text/plain',
      'application/octet-stream'
    ];

    if (!allowedMimeTypes.includes(rawFile.mimetype)) {
      return res.status(400).json({ 
        success: false, 
        message: `Raw file must be an Excel or CSV file. Received: ${rawFile.mimetype}` 
      });
    }

    // Get all SKUs for this brand and seller portal (if withInventory is true)
    let skuData = [];
    if (withInventory !== 'false') {
      const allSKUs = await SKU.findAll({
        where: {
          brandId: brandId,
          salesPortalId: sellerPortalId
        },
        order: [['salesPortalSku', 'ASC']]
      });

      if (allSKUs.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'No SKUs found for this brand and seller portal. Please add SKUs first.' 
        });
      }

      skuData = allSKUs.map(sku => ({
        SKU: sku.salesPortalSku,
        FG: sku.tallyNewSku
      }));
    }

    // Get state config for this brand and seller portal
    let stateConfigData = [];
    try {
      const stateConfig = await StateConfig.findOne({
        where: {
          brandId: brandId,
          sellerPortalId: sellerPortalId
        }
      });
      
      if (stateConfig && stateConfig.configData && stateConfig.configData.states) {
        stateConfigData = stateConfig.configData.states;
        console.log(`Found state config with ${stateConfigData.length} states`);
      } else {
        console.log('No state config found for this brand and seller portal');
      }
    } catch (stateConfigError) {
      console.warn('Error fetching state config:', stateConfigError.message);
    }

    // Process Blinkit macros
    let result;
    try {
      result = await processBlinkitMacros(
        rawFile.buffer,
        skuData,
        stateConfigData,
        brand.name,
        date,
        withInventory !== 'false'
      );
    } catch (error) {
      console.error('Error processing Blinkit macros:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to process Blinkit macros',
        error: error.message
      });
    }

    // Save output file
    const outputFileName = `Blinkit-${brand.name}-${date}-${uuidv4()}.xlsx`;
    const outputFilePath = path.join(OUTPUT_DIR, outputFileName);

    // Write XLSX workbook to file
    XLSX.writeFile(result.outputWorkbook, outputFilePath);
    console.log(`Output file saved: ${outputFilePath}`);

    // Save sales report data to database
    const salesRecords = result.salesReportData.map(row => ({
      id: uuidv4(),
      brandId: brandId,
      sellerPortalId: sellerPortalId,
      date: date,
      'S.No.': row['S.No.'] || null,
      'Order Id': row['Order Id'] || null,
      'Order Date': row['Order Date'] || null,
      'Item Id': row['Item Id'] || null,
      'Product Name': row['Product Name'] || null,
      'Brand Name': row['Brand Name'] || null,
      'UPC': row['UPC'] || null,
      'Variant Description': row['Variant Description'] || null,
      'Mapping on consumer app (L0, L1, L2)': row['Mapping on consumer app (L0, L1, L2)'] || null,
      'Business Category': row['Business Category'] || null,
      'Supply City': row['Supply City'] || null,
      'Supply State': row['Supply State'] || null,
      'Supply State GST': row['Supply State GST'] || null,
      'Customer City': row['Customer City'] || null,
      'Customer State': row['Customer State'] || null,
      'Order Status': row['Order Status'] || null,
      'HSN Code': row['HSN Code'] || null,
      'IGST(%)': row['IGST(%)'] || row['IGST (%)'] || null,
      'CGST(%)': row['CGST(%)'] || row['CGST (%)'] || null,
      'SGST(%)': row['SGST(%)'] || row['SGST (%)'] || null,
      'CESS(%)': row['CESS(%)'] || row['CESS (%)'] || null,
      'Quantity': row['Quantity'] || null,
      'MRP (Rs)': row['MRP (Rs)'] || row['MRP'] || null,
      'Selling Price (Rs)': row['Selling Price (Rs)'] || row['Selling Price'] || null,
      'IGST Value': row['IGST Value'] || null,
      'CGST Value': row['CGST Value'] || null,
      'SGST Value': row['SGST Value'] || null,
      'CESS Value': row['CESS Value'] || null,
      'Total Tax': row['Total Tax'] || null,
      'Total Gross Bill Amount': row['Total Gross Bill Amount'] || null,
      'Taxable value': row['Taxable value'] || null,
      'GST Rate': row['GST Rate'] || null
    }));

    await BlinkitSales.bulkCreate(salesRecords);
    console.log(`Saved ${salesRecords.length} sales records to database`);

    // Store SKUs in SKU table (if not already present)
    if (result.uniqueSKUs && result.uniqueSKUs.length > 0 && withInventory !== 'false') {
      for (const skuValue of result.uniqueSKUs) {
        // Check if SKU already exists
        const existingSKU = await SKU.findOne({
          where: {
            brandId: brandId,
            salesPortalId: sellerPortalId,
            salesPortalSku: skuValue
          }
        });

        if (!existingSKU) {
          // Create SKU with same name as sales portal SKU (user can update later)
          try {
            await SKU.create({
              brandId: brandId,
              salesPortalId: sellerPortalId,
              salesPortalSku: skuValue,
              tallyNewSku: skuValue // Default to same value, user can update
            });
            console.log(`Created SKU: ${skuValue}`);
          } catch (skuError) {
            console.warn(`Failed to create SKU ${skuValue}:`, skuError.message);
          }
        }
      }
    }

    // Store state config (if not already present)
    if (result.uniqueStates && result.uniqueStates.length > 0) {
      let stateConfig = await StateConfig.findOne({
        where: {
          brandId: brandId,
          sellerPortalId: sellerPortalId
        }
      });

      if (!stateConfig) {
        // Create new state config
        stateConfig = await StateConfig.create({
          brandId: brandId,
          sellerPortalId: sellerPortalId,
          configData: {
            states: result.uniqueStates.map(state => ({
              States: state
            }))
          }
        });
        console.log(`Created state config with ${result.uniqueStates.length} states`);
      } else {
        // Update existing state config - merge states
        const existingStates = stateConfig.configData?.states || [];
        const existingStateNames = new Set(existingStates.map(s => s.States || s.states));
        
        const newStates = result.uniqueStates
          .filter(state => !existingStateNames.has(state))
          .map(state => ({ States: state }));
        
        if (newStates.length > 0) {
          stateConfig.configData = {
            states: [...existingStates, ...newStates]
          };
          await stateConfig.save();
          console.log(`Updated state config with ${newStates.length} new states`);
        }
      }
    }

    // Save file metadata to macros_files table
    const macrosFile = await MacrosFiles.create({
      brandId: brandId,
      brandName: brand.name,
      sellerPortalId: sellerPortalId,
      sellerPortalName: sellerPortalName,
      date: date,
      process1_file_path: outputFilePath,
      pivot_file_path: null,
      process1_record_count: salesRecords.length,
      pivot_record_count: result.gtReportData.length + result.hsnReportData.length,
      fileType: 'BLINKIT'
    });

    res.status(201).json({
      success: true,
      message: 'Blinkit macros generated successfully',
      data: {
        id: macrosFile.id,
        brandId: brandId,
        brandName: brand.name,
        sellerPortalId: sellerPortalId,
        sellerPortalName: sellerPortalName,
        date: date,
        salesRecordCount: salesRecords.length,
        gtReportRecordCount: result.gtReportData.length,
        hsnReportRecordCount: result.hsnReportData.length,
        outputFile: outputFileName,
        fileType: 'BLINKIT'
      }
    });
  } catch (error) {
    console.error('Blinkit macros generation error:', error);
    next(error);
  }
};

/**
 * Download combined Blinkit macros file
 * GET /api/macros-blinkit/download/combined/:id
 */
exports.downloadCombined = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('Download Blinkit combined file requested for ID:', id);
    
    const macrosFile = await MacrosFiles.findByPk(id);

    if (!macrosFile) {
      console.log('Macros file not found for ID:', id);
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    if (!macrosFile.process1_file_path) {
      console.log('Blinkit file path is null for ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Blinkit file path not found'
      });
    }

    const filePath = macrosFile.process1_file_path;
    console.log('Attempting to read file from path:', filePath);
    
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);

    if (!fileExists) {
      console.log('File does not exist at path:', filePath);
      return res.status(404).json({
        success: false,
        message: `File not found on server at path: ${filePath}`
      });
    }

    try {
      const fileBuffer = await fs.readFile(filePath);
      console.log('File read successfully, size:', fileBuffer.length, 'bytes');
      
      const brand = await Brands.findByPk(macrosFile.brandId);
      const brandName = brand ? brand.name : 'Unknown';
      const fileName = `Blinkit-${brandName}-${macrosFile.date}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', fileBuffer.length);
      res.send(fileBuffer);
      console.log('File sent successfully');
    } catch (readError) {
      console.error('Error reading Blinkit file:', readError);
      return res.status(500).json({
        success: false,
        message: `Failed to read file: ${readError.message}. File path: ${filePath}`
      });
    }
  } catch (error) {
    console.error('Download Blinkit combined error:', error);
    next(error);
  }
};

/**
 * Get Blinkit files by brandId and sellerPortalId
 * GET /api/macros-blinkit/files/:brandId/:sellerPortalId
 */
exports.getFilesByBrandAndPortal = async (req, res, next) => {
  try {
    const { brandId, sellerPortalId } = req.params;
    
    const files = await MacrosFiles.findAll({
      where: { 
        brandId,
        sellerPortalId,
        fileType: 'BLINKIT'
      },
      include: [
        { model: Brands, as: 'brand', attributes: ['id', 'name'] },
        { model: SellerPortals, as: 'sellerPortal', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const fileList = files.map(file => ({
      id: file.id,
      brandId: file.brandId,
      brandName: file.brand ? file.brand.name : null,
      sellerPortalId: file.sellerPortalId,
      sellerPortalName: file.sellerPortalName || (file.sellerPortal ? file.sellerPortal.name : null),
      date: file.date,
      process1RecordCount: file.process1_record_count,
      pivotRecordCount: file.pivot_record_count,
      fileType: file.fileType,
      createdAt: file.createdAt
    }));

    res.json({
      success: true,
      count: fileList.length,
      data: fileList
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Blinkit macros file
 * DELETE /api/macros-blinkit/files/:id
 */
exports.deleteMacrosFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('Delete Blinkit macros file requested for ID:', id);
    
    const macrosFile = await MacrosFiles.findByPk(id);

    if (!macrosFile) {
      console.log('Macros file not found for ID:', id);
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Delete physical file if it exists
    if (macrosFile.process1_file_path) {
      try {
        const fileExists = await fs.access(macrosFile.process1_file_path).then(() => true).catch(() => false);
        if (fileExists) {
          await fs.unlink(macrosFile.process1_file_path);
          console.log('Deleted file:', macrosFile.process1_file_path);
        }
      } catch (fileError) {
        console.error(`Error deleting file ${macrosFile.process1_file_path}:`, fileError);
      }
    }

    // Delete database record
    await macrosFile.destroy();

    res.json({
      success: true,
      message: 'Blinkit macros file deleted successfully'
    });
  } catch (error) {
    console.error('Delete Blinkit macros file error:', error);
    next(error);
  }
};
