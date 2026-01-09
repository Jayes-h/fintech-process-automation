const FlipkartWorkingFile = require('../models/FlipkartWorkingFile');
const FlipkartPivot = require('../models/FlipkartPivot');
const FlipkartAfterPivot = require('../models/FlipkartAfterPivot');
const FlipkartStateConfig = require('../models/FlipkartStateConfig');
const MacrosFiles = require('../models/MacrosFiles');
const Brands = require('../models/Brands');
const SellerPortals = require('../models/SellerPortals');
const SKU = require('../models/SKU');
const { processFlipkartMacros } = require('../modules/Macros/flipkart/macrosProcessorFlipkart');
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
 * Generate Flipkart macros - Upload raw file and process
 * POST /api/macros-flipkart/generate
 */
exports.generateMacros = async (req, res, next) => {
  try {
    console.log('=== FLIPKART MACROS GENERATE REQUEST ===');
    console.log('Body:', req.body);
    console.log('Files:', req.files ? Object.keys(req.files) : 'No files');
    
    if (!req.files || !req.files.rawFile) {
      return res.status(400).json({ 
        success: false, 
        message: 'Raw file is required' 
      });
    }

    const { brandId, sellerPortalId, date } = req.body;

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

    // Get all SKUs for this brand and seller portal
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

    // Build SKU data array
    const skuData = allSKUs.map(sku => ({
      SKU: sku.salesPortalSku,
      FG: sku.tallyNewSku
    }));

    // Get Flipkart state config for this brand and seller portal
    let stateConfigData = [];
    try {
      const stateConfig = await FlipkartStateConfig.findOne({
        where: {
          brandId: brandId,
          sellerPortalId: sellerPortalId
        }
      });
      
      if (stateConfig && stateConfig.configData && stateConfig.configData.states) {
        stateConfigData = stateConfig.configData.states;
        console.log(`Found Flipkart state config with ${stateConfigData.length} states`);
      } else {
        console.log('No Flipkart state config found for this brand and seller portal');
      }
    } catch (stateConfigError) {
      console.warn('Error fetching Flipkart state config:', stateConfigError.message);
    }

    // Process Flipkart macros
    let result;
    try {
      result = await processFlipkartMacros(
        rawFile.buffer,
        skuData,
        stateConfigData,
        brand.name,
        date
      );
    } catch (error) {
      // Check if error is about missing SKUs
      if (error.missingSKUs) {
        return res.status(400).json({
          success: false,
          message: error.message || 'Some SKUs are missing from the database',
          missingSKUs: error.missingSKUs,
          error: error.message
        });
      }
      throw error;
    }

    // Save output file
    const outputFileName = `Flipkart-${brand.name}-${date}-${uuidv4()}.xlsx`;
    const outputFilePath = path.join(OUTPUT_DIR, outputFileName);

    // Write XLSX workbook to file
    XLSX.writeFile(result.outputWorkbook, outputFilePath);
    console.log(`Output file saved: ${outputFilePath}`);

    // Save working file data to database
    const workingRecords = result.workingFileData.map(row => ({
      brandId: brandId,
      sellerPortalId: sellerPortalId,
      date: date,
      ...row
    }));
    await FlipkartWorkingFile.bulkCreate(workingRecords);
    console.log(`Saved ${workingRecords.length} working file records to database`);

    // Save pivot data to database
    const pivotRecords = result.pivotData.map(row => ({
      brandId: brandId,
      sellerPortalId: sellerPortalId,
      date: date,
      ...row
    }));
    await FlipkartPivot.bulkCreate(pivotRecords);
    console.log(`Saved ${pivotRecords.length} pivot records to database`);

    // Save after-pivot data to database
    const afterPivotRecords = result.afterPivotData.map(row => ({
      brandId: brandId,
      sellerPortalId: sellerPortalId,
      date: date,
      ...row
    }));
    await FlipkartAfterPivot.bulkCreate(afterPivotRecords);
    console.log(`Saved ${afterPivotRecords.length} after-pivot records to database`);

    // Save file metadata to macros_files table
    const macrosFile = await MacrosFiles.create({
      brandId: brandId,
      brandName: brand.name,
      sellerPortalId: sellerPortalId,
      sellerPortalName: sellerPortalName,
      date: date,
      process1_file_path: outputFilePath,
      pivot_file_path: null, // Combined file
      process1_record_count: workingRecords.length,
      pivot_record_count: pivotRecords.length,
      fileType: 'FLIPKART'
    });

    res.status(201).json({
      success: true,
      message: 'Flipkart macros generated successfully',
      data: {
        id: macrosFile.id,
        brandId: brandId,
        brandName: brand.name,
        sellerPortalId: sellerPortalId,
        sellerPortalName: sellerPortalName,
        date: date,
        workingRecordCount: workingRecords.length,
        pivotRecordCount: pivotRecords.length,
        afterPivotRecordCount: afterPivotRecords.length,
        outputFile: outputFileName,
        fileType: 'FLIPKART'
      }
    });
  } catch (error) {
    console.error('Flipkart macros generation error:', error);
    next(error);
  }
};

/**
 * Download combined Flipkart macros file
 * GET /api/macros-flipkart/download/combined/:id
 */
exports.downloadCombined = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('Download Flipkart combined file requested for ID:', id);
    
    const macrosFile = await MacrosFiles.findByPk(id);

    if (!macrosFile) {
      console.log('Macros file not found for ID:', id);
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    if (!macrosFile.process1_file_path) {
      console.log('Flipkart file path is null for ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Flipkart file path not found'
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
      const fileName = `Flipkart-${brandName}-${macrosFile.date}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', fileBuffer.length);
      res.send(fileBuffer);
      console.log('File sent successfully');
    } catch (readError) {
      console.error('Error reading Flipkart file:', readError);
      return res.status(500).json({
        success: false,
        message: `Failed to read file: ${readError.message}. File path: ${filePath}`
      });
    }
  } catch (error) {
    console.error('Download Flipkart combined error:', error);
    next(error);
  }
};

/**
 * Get Flipkart files by brandId and sellerPortalId
 * GET /api/macros-flipkart/files/:brandId/:sellerPortalId
 */
exports.getFilesByBrandAndPortal = async (req, res, next) => {
  try {
    const { brandId, sellerPortalId } = req.params;
    
    const files = await MacrosFiles.findAll({
      where: { 
        brandId,
        sellerPortalId,
        fileType: 'FLIPKART'
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
 * Delete Flipkart macros file
 * DELETE /api/macros-flipkart/files/:id
 */
exports.deleteMacrosFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('Delete Flipkart macros file requested for ID:', id);
    
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
      message: 'Flipkart macros file deleted successfully'
    });
  } catch (error) {
    console.error('Delete Flipkart macros file error:', error);
    next(error);
  }
};

/**
 * Get Flipkart working file data
 * GET /api/macros-flipkart/working/:brandId/:sellerPortalId/:date
 */
exports.getWorkingFileData = async (req, res, next) => {
  try {
    const { brandId, sellerPortalId, date } = req.params;
    
    const data = await FlipkartWorkingFile.findAll({
      where: { 
        brandId,
        sellerPortalId,
        date
      },
      limit: 1000
    });

    res.json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Flipkart pivot data
 * GET /api/macros-flipkart/pivot/:brandId/:sellerPortalId/:date
 */
exports.getPivotData = async (req, res, next) => {
  try {
    const { brandId, sellerPortalId, date } = req.params;
    
    const data = await FlipkartPivot.findAll({
      where: { 
        brandId,
        sellerPortalId,
        date
      }
    });

    res.json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Flipkart after-pivot data
 * GET /api/macros-flipkart/after-pivot/:brandId/:sellerPortalId/:date
 */
exports.getAfterPivotData = async (req, res, next) => {
  try {
    const { brandId, sellerPortalId, date } = req.params;
    
    const data = await FlipkartAfterPivot.findAll({
      where: { 
        brandId,
        sellerPortalId,
        date
      }
    });

    res.json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (error) {
    next(error);
  }
};


