const AmazonB2CProcess1 = require('../models/AmazonB2CProcess1');
const AmazonB2CPivot = require('../models/AmazonB2CPivot');
const MacrosFiles = require('../models/MacrosFiles');
const Brands = require('../models/Brands');
const SellerPortals = require('../models/SellerPortals');
const SKU = require('../models/SKU');
const { processMacrosB2B } = require('../modules/Macros/macrosProcessorAmazonB2B');
const XLSX = require('xlsx-js-style');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs').promises;
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

// Directory to store uploaded files
const UPLOAD_DIR = path.join(__dirname, '../uploads/macros');
const OUTPUT_DIR = path.join(__dirname, '../outputs/macros');

// Ensure directories exist
async function ensureDirectories() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating directories:', error);
  }
}

// Initialize directories on module load
ensureDirectories();

/**
 * Map Excel column names to database field names (B2B)
 */
function mapToProcess1Fields(row, brandId, sellerPortalId, date) {
  return {
    brandId: brandId,
    sellerPortalId: sellerPortalId,
    date: date,
    seller_gstin: row['Seller Gstin'] || null,
    invoice_number: row['Invoice Number'] || row['Final Invoice No.'] || null,
    invoice_date: row['Invoice Date'] || null,
    transaction_type: row['Transaction Type'] || null,
    order_id: row['Order Id'] || null,
    shipment_id: row['Shipment Id'] || null,
    shipment_date: row['Shipment Date'] || null,
    order_date: row['Order Date'] || null,
    shipment_item_id: row['Shipment Item Id'] || null,
    quantity: parseFloat(row['Quantity'] || 0) || null,
    item_description: row['Item Description'] || null,
    asin: row['Asin'] || null,
    hsn_sac: row['Hsn/sac'] || null,
    sku: row['Sku'] || null,
    fg: row['FG'] || null,
    product_tax_code: row['Product Tax Code'] || null,
    bill_from_city: row['Bill From City'] || null,
    bill_from_state: row['Bill From State'] || null,
    bill_from_country: row['Bill From Country'] || null,
    bill_from_postal_code: row['Bill From Postal Code'] || null,
    ship_from_city: row['Ship From City'] || null,
    ship_from_state: row['Ship From State'] || null,
    ship_from_country: row['Ship From Country'] || null,
    ship_from_postal_code: row['Ship From Postal Code'] || null,
    ship_to_city: row['Ship To City'] || null,
    ship_to_state: row['Ship To State'] || null,
    ship_to_state_tally_ledger: row['Ship To State Tally Ledger'] || null,
    final_invoice_no: row['Final Invoice No.'] || null,
    ship_to_country: row['Ship To Country'] || null,
    ship_to_postal_code: row['Ship To Postal Code'] || null,
    invoice_amount: parseFloat(row['Invoice Amount'] || 0) || null,
    tax_exclusive_gross: parseFloat(row['Tax Exclusive Gross'] || 0) || null,
    total_tax_amount: parseFloat(row['Total Tax Amount'] || 0) || null,
    cgst_rate: parseFloat(row['Cgst Rate'] || 0) || null,
    sgst_rate: parseFloat(row['Sgst Rate'] || 0) || null,
    utgst_rate: parseFloat(row['Utgst Rate'] || 0) || null,
    igst_rate: parseFloat(row['Igst Rate'] || 0) || null,
    compensatory_cess_rate: parseFloat(row['Compensatory Cess Rate'] || 0) || null,
    principal_amount: parseFloat(row['Principal Amount'] || 0) || null,
    principal_amount_basis: parseFloat(row['Principal Amount Basis'] || 0) || null,
    cgst_tax: parseFloat(row['Cgst Tax'] || 0) || null,
    sgst_tax: parseFloat(row['Sgst Tax'] || 0) || null,
    igst_tax: parseFloat(row['Igst Tax'] || 0) || null,
    utgst_tax: parseFloat(row['Utgst Tax'] || 0) || null,
    compensatory_cess_tax: parseFloat(row['Compensatory Cess Tax'] || 0) || null,
    final_tax_rate: parseFloat(row['Final Tax rate'] || 0) || null,
    final_taxable_sales_value: parseFloat(row['Final Taxable Sales Value'] || 0) || null,
    final_taxable_shipping_value: parseFloat(row['Final Taxable Shipping Value'] || 0) || null,
    final_cgst_tax: parseFloat(row['Final CGST Tax'] || 0) || null,
    final_sgst_tax: parseFloat(row['Final SGST Tax'] || 0) || null,
    final_igst_tax: parseFloat(row['Final IGST Tax'] || 0) || null,
    final_shipping_cgst_tax: parseFloat(row['Final Shipping CGST Tax'] || 0) || null,
    final_shipping_sgst_tax: parseFloat(row['Final Shipping SGST Tax'] || 0) || null,
    final_shipping_igst_tax: parseFloat(row['Final Shipping IGST Tax'] || 0) || null,
    shipping_amount: parseFloat(row['Shipping Amount'] || 0) || null,
    shipping_amount_basis: parseFloat(row['Shipping Amount Basis'] || 0) || null,
    shipping_cgst_tax: parseFloat(row['Shipping Cgst Tax'] || 0) || null,
    shipping_sgst_tax: parseFloat(row['Shipping Sgst Tax'] || 0) || null,
    shipping_utgst_tax: parseFloat(row['Shipping Utgst Tax'] || 0) || null,
    shipping_igst_tax: parseFloat(row['Shipping Igst Tax'] || 0) || null,
    shipping_cess_tax_amount: parseFloat(row['Shipping Cess Tax Amount'] || 0) || null,
    gift_wrap_amount: parseFloat(row['Gift Wrap Amount'] || 0) || null,
    gift_wrap_amount_basis: parseFloat(row['Gift Wrap Amount Basis'] || 0) || null,
    gift_wrap_cgst_tax: parseFloat(row['Gift Wrap Cgst Tax'] || 0) || null,
    gift_wrap_sgst_tax: parseFloat(row['Gift Wrap Sgst Tax'] || 0) || null,
    gift_wrap_utgst_tax: parseFloat(row['Gift Wrap Utgst Tax'] || 0) || null,
    gift_wrap_igst_tax: parseFloat(row['Gift Wrap Igst Tax'] || 0) || null,
    gift_wrap_compensatory_cess_tax: parseFloat(row['Gift Wrap Compensatory Cess Tax'] || 0) || null,
    item_promo_discount: parseFloat(row['Item Promo Discount'] || 0) || null,
    item_promo_discount_basis: parseFloat(row['Item Promo Discount Basis'] || 0) || null,
    item_promo_tax: parseFloat(row['Item Promo Tax'] || 0) || null,
    shipping_promo_discount: parseFloat(row['Shipping Promo Discount'] || 0) || null,
    shipping_promo_discount_basis: parseFloat(row['Shipping Promo Discount Basis'] || 0) || null,
    shipping_promo_tax: parseFloat(row['Shipping Promo Tax'] || 0) || null,
    gift_wrap_promo_discount: parseFloat(row['Gift Wrap Promo Discount'] || 0) || null,
    gift_wrap_promo_discount_basis: parseFloat(row['Gift Wrap Promo Discount Basis'] || 0) || null,
    gift_wrap_promo_tax: parseFloat(row['Gift Wrap Promo Tax'] || 0) || null,
    tcs_cgst_rate: parseFloat(row['Tcs Cgst Rate'] || 0) || null,
    tcs_cgst_amount: parseFloat(row['Tcs Cgst Amount'] || 0) || null,
    tcs_sgst_rate: parseFloat(row['Tcs Sgst Rate'] || 0) || null,
    tcs_sgst_amount: parseFloat(row['Tcs Sgst Amount'] || 0) || null,
    tcs_utgst_rate: parseFloat(row['Tcs Utgst Rate'] || 0) || null,
    tcs_utgst_amount: parseFloat(row['Tcs Utgst Amount'] || 0) || null,
    tcs_igst_rate: parseFloat(row['Tcs Igst Rate'] || 0) || null,
    tcs_igst_amount: parseFloat(row['Tcs Igst Amount'] || 0) || null,
    final_amount_receivable: parseFloat(row['Final Amount Receivable'] || 0) || null,
    warehouse_id: row['Warehouse Id'] || null,
    fulfillment_channel: row['Fulfillment Channel'] || null,
    payment_method_code: row['Payment Method Code'] || null,
    credit_note_no: row['Credit Note No'] || null,
    credit_note: row['Credit Note'] || null
  };
}

/**
 * Map pivot data to database fields (B2B)
 */
function mapToPivotFields(row, brandId, sellerPortalId, date) {
  return {
    brandId: brandId,
    sellerPortalId: sellerPortalId,
    date: date,
    seller_gstin: row['Seller Gstin'] || null,
    final_invoice_no: row['Final Invoice No.'] || null,
    ship_to_state_tally_ledger: row['Ship To State Tally Ledger'] || null,
    fg: row['FG'] || null,
    sum_of_quantity: parseFloat(row['Sum of Quantity'] || 0) || 0,
    sum_of_final_taxable_sales_value: parseFloat(row['Sum of Final Taxable Sales Value'] || 0) || 0,
    sum_of_final_cgst_tax: parseFloat(row['Sum of Final CGST Tax'] || 0) || 0,
    sum_of_final_sgst_tax: parseFloat(row['Sum of Final SGST Tax'] || 0) || 0,
    sum_of_final_igst_tax: parseFloat(row['Sum of Final IGST Tax'] || 0) || 0,
    sum_of_final_taxable_shipping_value: parseFloat(row['Sum of Final Taxable Shipping Value'] || 0) || 0,
    sum_of_final_shipping_cgst_tax: parseFloat(row['Sum of Final Shipping CGST Tax'] || 0) || 0,
    sum_of_final_shipping_sgst_tax: parseFloat(row['Sum of Final Shipping SGST Tax'] || 0) || 0,
    sum_of_final_shipping_igst_tax: parseFloat(row['Sum of Final Shipping IGST Tax'] || 0) || 0,
    sum_of_tcs_cgst_amount: parseFloat(row['Sum of Tcs Cgst Amount'] || 0) || 0,
    sum_of_tcs_sgst_amount: parseFloat(row['Sum of Tcs Sgst Amount'] || 0) || 0,
    sum_of_tcs_igst_amount: parseFloat(row['Sum of Tcs Igst Amount'] || 0) || 0,
    sum_of_final_amount_receivable: parseFloat(row['Sum of Final Amount Receivable'] || 0) || 0
  };
}

/**
 * Generate macros for Amazon B2B - Upload files and process
 * POST /api/macros-b2b/generate
 */
exports.generateMacros = async (req, res, next) => {
  try {
    // Debug: Log incoming request
    console.log('=== AMAZON B2B MACROS GENERATE REQUEST ===');
    console.log('Body:', req.body);
    console.log('Files:', req.files ? Object.keys(req.files) : 'No files');
    
    if (!req.files || !req.files.rawFile) {
      return res.status(400).json({ 
        success: false, 
        message: 'Raw file is required' 
      });
    }

    // Parse withInventory FIRST - before any other operations
    // FormData sends values as strings, so 'false' is the string 'false', not boolean false
    const withInventoryRaw = req.body.withInventory;
    let useInventory = true; // Default to true
    
    if (withInventoryRaw !== undefined && withInventoryRaw !== null) {
      const withInventoryStr = String(withInventoryRaw).toLowerCase().trim();
      // Explicitly check for false values - if it's 'false', '0', 'no', or empty string, set to false
      if (withInventoryStr === 'false' || withInventoryStr === '0' || withInventoryStr === 'no') {
        useInventory = false;
      } else {
        useInventory = true;
      }
    }
    
    console.log(`=== INVENTORY CHECK ===`);
    console.log(`withInventory raw value: ${withInventoryRaw} (type: ${typeof withInventoryRaw})`);
    console.log(`useInventory (will fetch SKUs): ${useInventory}`);
    console.log(`Full req.body:`, JSON.stringify(req.body, null, 2));
    
    const { brandId, sellerPortalId, date, skuId } = req.body;
    
    // SKU ID is NO LONGER REQUIRED
    if (skuId) {
      console.log('⚠️  Warning: skuId parameter received but will be ignored. SKUs are now fetched automatically.');
    }

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

    // Validate file buffers exist
    if (!rawFile.buffer || rawFile.buffer.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Raw file buffer is empty or corrupted' 
      });
    }

    // Validate file types (Excel and CSV)
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel',                                          // .xls
      'application/vnd.ms-excel.sheet.macroEnabled.12',                    // .xlsm
      'text/csv',                                                          // .csv
      'application/csv',                                                   // .csv alternative
      'text/plain',                                                        // .csv sometimes detected as text/plain
      'application/octet-stream'                                           // fallback for unknown types
    ];

    if (!allowedMimeTypes.includes(rawFile.mimetype)) {
      return res.status(400).json({ 
        success: false, 
        message: `Raw file must be an Excel or CSV file (.xlsx, .xls, .csv). Received: ${rawFile.mimetype}` 
      });
    }

    // Validate file extensions
    const rawFileExt = rawFile.originalname.split('.').pop().toLowerCase();
    
    if (!['xlsx', 'xls', 'csv'].includes(rawFileExt)) {
      return res.status(400).json({ 
        success: false, 
        message: `Raw file must have .xlsx, .xls, or .csv extension. Received: .${rawFileExt}` 
      });
    }

    // Get all SKUs for this brand and seller portal to build Source sheet
    // COMPLETELY SKIP SKU operations if useInventory is false
    let allSKUs = [];
    let sourceSheetData = [];
    let skuFileBuffer = null;

    if (!useInventory) {
      // WITHOUT INVENTORY MODE: Skip all SKU-related operations
      console.log('=== WITHOUT INVENTORY MODE: Skipping ALL SKU operations ===');
      // Create an empty SKU workbook for compatibility (processor expects a buffer)
      const skuWorkbook = XLSX.utils.book_new();
      const skuSheet = XLSX.utils.json_to_sheet([]);
      XLSX.utils.book_append_sheet(skuWorkbook, skuSheet, 'Source');
      skuFileBuffer = XLSX.write(skuWorkbook, { type: 'buffer', bookType: 'xlsx' });
      console.log('Created empty SKU workbook buffer for compatibility');
      // Skip to processing section
    } else {
      // WITH INVENTORY MODE: Fetch SKUs from database
      console.log('=== WITH INVENTORY MODE: Fetching SKUs from database ===');
      allSKUs = await SKU.findAll({
        where: {
          brandId: brandId,
          salesPortalId: sellerPortalId
        },
        order: [['salesPortalSku', 'ASC']]
      });

      console.log(`Found ${allSKUs.length} SKUs`);
      if (allSKUs.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'No SKUs found for this brand and seller portal' 
        });
      }

      // Build Source sheet from SKU data
      sourceSheetData = allSKUs.map(sku => ({
        'SKU': sku.salesPortalSku,
        'FG': sku.tallyNewSku
      }));

      // Create a temporary SKU workbook in memory
      const skuWorkbook = XLSX.utils.book_new();
      const skuSheet = XLSX.utils.json_to_sheet(sourceSheetData);
      XLSX.utils.book_append_sheet(skuWorkbook, skuSheet, 'Source');
      skuFileBuffer = XLSX.write(skuWorkbook, { type: 'buffer', bookType: 'xlsx' });
      console.log('Created SKU workbook with data');
    }

    // Process macros for B2B (no stateConfigData needed)
    let result;
    let missingSKUs = [];
    
    try {
      result = await processMacrosB2B(
        rawFile.buffer,
        skuFileBuffer,
        brand.name,
        date,
        sourceSheetData, // SKU data for source-sku sheet
        null,            // stateConfigData (not used in B2B)
        useInventory     // withInventory parameter
      );
    } catch (error) {
      // Check if error is about missing SKUs
      if (error.message && (error.message.includes('SKU') && error.message.includes('missing')) || error.missingSKUs) {
        missingSKUs = error.missingSKUs || [];
        
        if (missingSKUs.length === 0 && error.message.includes(':')) {
          const skuListMatch = error.message.match(/:\s*([^,]+(?:,\s*[^,]+)*)/);
          if (skuListMatch) {
            missingSKUs = skuListMatch[1].split(',').map(s => s.trim()).filter(s => s);
          }
        }
        
        return res.status(400).json({
          success: false,
          message: error.message || 'Some SKUs are missing from the database',
          missingSKUs: missingSKUs,
          error: error.message
        });
      }
      throw error;
    }

    // Save output files (B2B naming)
    const outputFileName = `amazon-b2b-process1_${brand.name}_${sellerPortalName}_${date}_${uuidv4()}.xlsx`;
    const outputFilePath = path.join(OUTPUT_DIR, outputFileName);

    // Write ExcelJS workbook (with formulas) to file
    await result.workbook.xlsx.writeFile(outputFilePath);

    // Also create pivot/report file
    const pivotFileName = `amazon-b2b-pivot_${brand.name}_${sellerPortalName}_${date}_${uuidv4()}.xlsx`;
    const pivotFilePath = path.join(OUTPUT_DIR, pivotFileName);
    XLSX.writeFile(result.outputWorkbook, pivotFilePath);

    // Save Process1 data to database (using existing tables for now)
    const process1Records = [];
    for (const row of result.process1Json) {
      const mappedRow = mapToProcess1Fields(row, brandId, sellerPortalId, date);
      process1Records.push(mappedRow);
    }
    await AmazonB2CProcess1.bulkCreate(process1Records);

    // Save Pivot data to database
    const pivotRecords = [];
    for (const row of result.pivotData) {
      const mappedRow = mapToPivotFields(row, brandId, sellerPortalId, date);
      pivotRecords.push(mappedRow);
    }
    await AmazonB2CPivot.bulkCreate(pivotRecords);

    // Get fileType from request body
    const fileType = req.body.fileType || 'B2B';

    // Save file metadata to macros_files table
    const macrosFile = await MacrosFiles.create({
      brandId: brandId,
      brandName: brand.name,
      sellerPortalId: sellerPortalId,
      sellerPortalName: sellerPortalName,
      date: date,
      process1_file_path: outputFilePath,
      pivot_file_path: pivotFilePath,
      process1_record_count: process1Records.length,
      pivot_record_count: pivotRecords.length,
      fileType: fileType
    });

    res.status(201).json({
      success: true,
      message: 'Amazon B2B Macros generated successfully',
      data: {
        id: macrosFile.id,
        brandId: brandId,
        brandName: brand.name,
        sellerPortalId: sellerPortalId,
        sellerPortalName: sellerPortalName,
        date: date,
        process1RecordCount: process1Records.length,
        pivotRecordCount: pivotRecords.length,
        outputFile: outputFileName,
        pivotFile: pivotFileName,
        fileType: fileType
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all brands
 * GET /api/macros-b2b/brands
 */
exports.getAllBrands = async (req, res, next) => {
  try {
    const brands = await Brands.findAll({
      order: [['name', 'ASC']]
    });
    
    res.json({
      success: true,
      data: brands.map(b => b.name)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get files by seller portal and brand (B2B only)
 * GET /api/macros-b2b/brand/:sellerPortalName?brandId=...
 */
exports.getFilesByBrand = async (req, res, next) => {
  try {
    const { sellerPortalName } = req.params;
    const { brandId } = req.query;
    
    const sellerPortal = await SellerPortals.findOne({
      where: { name: { [Op.iLike]: sellerPortalName } }
    });

    if (!sellerPortal) {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }
    
    const where = { 
      sellerPortalId: sellerPortal.id,
      fileType: 'B2B' // Only B2B files
    };
    if (brandId) {
      where.brandId = brandId;
    }
    
    const files = await MacrosFiles.findAll({
      where,
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
 * Get files by brandId and sellerPortalId (B2B only)
 * GET /api/macros-b2b/files/:brandId/:sellerPortalId
 */
exports.getFilesByBrandAndPortal = async (req, res, next) => {
  try {
    const { brandId, sellerPortalId } = req.params;
    
    const files = await MacrosFiles.findAll({
      where: { 
        brandId,
        sellerPortalId,
        fileType: 'B2B' // Only B2B files
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
 * Download Amazon B2B Process1 file
 * GET /api/macros-b2b/download/process1/:id
 */
exports.downloadProcess1 = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('Download Amazon B2B Process1 requested for ID:', id);
    
    const macrosFile = await MacrosFiles.findByPk(id);

    if (!macrosFile) {
      console.log('Macros file not found for ID:', id);
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    if (!macrosFile.process1_file_path) {
      console.log('Amazon B2B Process1 file path is null for ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Amazon B2B Process1 file path not found'
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
      const fileName = `amazon-b2b-process1_${brandName}_${macrosFile.sellerPortalName || 'Unknown'}_${macrosFile.date}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', fileBuffer.length);
      res.send(fileBuffer);
      console.log('File sent successfully');
    } catch (readError) {
      console.error('Error reading Amazon B2B Process1 file:', readError);
      return res.status(500).json({
        success: false,
        message: `Failed to read file: ${readError.message}. File path: ${filePath}`
      });
    }
  } catch (error) {
    console.error('Download Amazon B2B Process1 error:', error);
    next(error);
  }
};

/**
 * Download Amazon B2B Pivot file
 * GET /api/macros-b2b/download/pivot/:id
 */
exports.downloadPivot = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('Download Amazon B2B Pivot requested for ID:', id);
    
    const macrosFile = await MacrosFiles.findByPk(id);

    if (!macrosFile) {
      console.log('Macros file not found for ID:', id);
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    if (!macrosFile.pivot_file_path) {
      console.log('Amazon B2B Pivot file path is null for ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Amazon B2B Pivot file path not found'
      });
    }

    const filePath = macrosFile.pivot_file_path;
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
      const fileName = `amazon-b2b-pivot_${brandName}_${macrosFile.sellerPortalName || 'Unknown'}_${macrosFile.date}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', fileBuffer.length);
      res.send(fileBuffer);
      console.log('File sent successfully');
    } catch (readError) {
      console.error('Error reading Amazon B2B Pivot file:', readError);
      return res.status(500).json({
        success: false,
        message: `Failed to read file: ${readError.message}. File path: ${filePath}`
      });
    }
  } catch (error) {
    console.error('Download Amazon B2B Pivot error:', error);
    next(error);
  }
};

/**
 * Download combined Amazon B2B Process1 and Pivot file
 * GET /api/macros-b2b/download/combined/:id
 */
exports.downloadCombined = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('Download Combined B2B file requested for ID:', id);
    
    const macrosFile = await MacrosFiles.findByPk(id);

    if (!macrosFile) {
      console.log('Macros file not found for ID:', id);
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    if (!macrosFile.process1_file_path || !macrosFile.pivot_file_path) {
      console.log('One or both file paths are missing');
      return res.status(404).json({
        success: false,
        message: 'Amazon B2B Process1 or Pivot file path not found'
      });
    }

    const process1Path = macrosFile.process1_file_path;
    const pivotPath = macrosFile.pivot_file_path;
    
    const process1Exists = await fs.access(process1Path).then(() => true).catch(() => false);
    const pivotExists = await fs.access(pivotPath).then(() => true).catch(() => false);

    if (!process1Exists || !pivotExists) {
      return res.status(404).json({
        success: false,
        message: `One or both files not found. Process1: ${process1Exists}, Pivot: ${pivotExists}`
      });
    }

    try {
      const combinedWorkbook = new ExcelJS.Workbook();

      // Read Process1 file and add as first sheet
      const process1Workbook = new ExcelJS.Workbook();
      await process1Workbook.xlsx.readFile(process1Path);
      const process1Worksheet = process1Workbook.worksheets[0];
      
      const process1Sheet = combinedWorkbook.addWorksheet('amazon-b2b-process1');
      process1Worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const newRow = process1Sheet.getRow(rowNumber);
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          const newCell = newRow.getCell(colNumber);
          newCell.value = cell.value;
          newCell.style = cell.style;
          if (cell.formula) {
            newCell.formula = cell.formula;
          }
        });
      });
      
      process1Worksheet.columns.forEach((column, index) => {
        if (column.width) {
          process1Sheet.getColumn(index + 1).width = column.width;
        }
      });

      // Read Pivot file and add ALL sheets from it
      const pivotWorkbook = XLSX.readFile(pivotPath);
      console.log(`Pivot file has ${pivotWorkbook.SheetNames.length} sheets: ${pivotWorkbook.SheetNames.join(', ')}`);
      
      for (const sheetName of pivotWorkbook.SheetNames) {
        if (sheetName === 'amazon-b2b-process1') {
          console.log(`Skipping ${sheetName} from pivot file (already added from process1 file)`);
          continue;
        }
        
        const pivotWorksheet = pivotWorkbook.Sheets[sheetName];
        const newSheet = combinedWorkbook.addWorksheet(sheetName);
        
        const range = XLSX.utils.decode_range(pivotWorksheet['!ref'] || 'A1');
        
        for (let R = range.s.r; R <= range.e.r; R++) {
          for (let C = range.s.c; C <= range.e.c; C++) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = pivotWorksheet[cellAddress];
            
            if (cell) {
              const excelRow = R + 1;
              const excelCol = C + 1;
              const targetCell = newSheet.getCell(excelRow, excelCol);
              
              if (cell.f) {
                targetCell.value = { formula: cell.f };
              } else if (cell.v !== undefined) {
                targetCell.value = cell.v;
              }
              
              if (R === 0) {
                targetCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                targetCell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FF2F5597' }
                };
                targetCell.alignment = { vertical: 'middle', horizontal: 'center' };
              }
            }
          }
        }
      }

      const brand = await Brands.findByPk(macrosFile.brandId);
      const brandName = brand ? brand.name : 'Unknown';
      const fileName = `AmazonB2B_${brandName}_${macrosFile.sellerPortalName || 'Unknown'}_${macrosFile.date}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      await combinedWorkbook.xlsx.write(res);
      console.log('Combined B2B file sent successfully');
    } catch (combineError) {
      console.error('Error creating combined B2B file:', combineError);
      return res.status(500).json({
        success: false,
        message: `Failed to create combined file: ${combineError.message}`
      });
    }
  } catch (error) {
    console.error('Download Combined B2B error:', error);
    next(error);
  }
};

/**
 * Delete macros file (B2B)
 * DELETE /api/macros-b2b/files/:id
 */
exports.deleteMacrosFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const macrosFile = await MacrosFiles.findByPk(id);

    if (!macrosFile) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Delete file from disk
    if (macrosFile.process1_file_path) {
      try {
        await fs.unlink(macrosFile.process1_file_path);
      } catch (e) {
        console.warn('Could not delete process1 file:', e.message);
      }
    }

    if (macrosFile.pivot_file_path) {
      try {
        await fs.unlink(macrosFile.pivot_file_path);
      } catch (e) {
        console.warn('Could not delete pivot file:', e.message);
      }
    }

    // Delete from database
    await macrosFile.destroy();

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Process1 data (B2B)
 * GET /api/macros-b2b/process1/:brandId/:sellerPortalId/:date
 */
exports.getProcess1Data = async (req, res, next) => {
  try {
    const { brandId, sellerPortalId, date } = req.params;
    
    const data = await AmazonB2CProcess1.findAll({
      where: {
        brandId: brandId,
        sellerPortalId: sellerPortalId,
        date: date
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
 * Get Pivot data (B2B)
 * GET /api/macros-b2b/pivot/:brandId/:sellerPortalId/:date
 */
exports.getPivotData = async (req, res, next) => {
  try {
    const { brandId, sellerPortalId, date } = req.params;
    
    const data = await AmazonB2CPivot.findAll({
      where: {
        brandId: brandId,
        sellerPortalId: sellerPortalId,
        date: date
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

