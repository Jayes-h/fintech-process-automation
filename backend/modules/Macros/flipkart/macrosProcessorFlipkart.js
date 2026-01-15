const XLSX = require('xlsx-js-style');

/**
 * GST State Code to State Name mapping
 */
const GST_STATE_CODES = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Dadra & Nagar Haveli and Daman & Diu',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh (New)',
  '38': 'Ladakh'
};

/**
 * Raw file header mapping to internal keys
 */
const RAW_HEADERS = [
  'Seller GSTIN',
  'Order ID',
  'Order Item ID',
  'Product Title/Description',
  'FSN',
  'SKU',
  'HSN Code',
  'Event Type',
  'Event Sub Type',
  'Order Type',
  'Fulfilment Type',
  'Order Date',
  'Order Approval Date',
  'Item Quantity',
  'Order Shipped From (State)',
  'Warehouse ID',
  'Price before discount',
  'Total Discount',
  'Seller Share',
  'Bank Offer Share',
  'Price after discount (Price before discount-Total discount)',
  'Shipping Charges',
  'Final Invoice Amount (Price after discount+Shipping Charges)',
  'Type of tax',
  'Taxable Value (Final Invoice Amount -Taxes)',
  'CST Rate',
  'CST Amount',
  'VAT Rate',
  'VAT Amount',
  'Luxury Cess Rate',
  'Luxury Cess Amount',
  'IGST Rate',
  'IGST Amount',
  'CGST Rate',
  'CGST Amount',
  'SGST Rate (or UTGST as applicable)',
  'SGST Amount (Or UTGST as applicable)',
  'TCS IGST Rate',
  'TCS IGST Amount',
  'TCS CGST Rate',
  'TCS CGST Amount',
  'TCS SGST Rate',
  'TCS SGST Amount',
  'Total TCS Deducted',
  'Buyer Invoice ID',
  'Buyer Invoice Date',
  'Buyer Invoice Amount',
  "Customer's Billing Pincode",
  "Customer's Billing State",
  "Customer's Delivery Pincode",
  "Customer's Delivery State",
  'Usual Price',
  'Is Shopsy Order?',
  'TDS Rate',
  'TDS Amount',
  'IRN',
  'Business Name',
  'Business GST Number',
  'Beneficiary Name',
  'IMEI'
];

/**
 * Safe number conversion
 */
function safeNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Clean SKU - remove quotes and SKU: prefix
 */
function cleanSKU(sku) {
  if (!sku) return '';
  let cleaned = String(sku).trim();
  // Remove leading/trailing quotes
  cleaned = cleaned.replace(/^["']+|["']+$/g, '');
  // Remove "SKU:" prefix
  cleaned = cleaned.replace(/^SKU:/i, '');
  return cleaned.trim();
}

/**
 * Get state name from GSTIN (first 2 chars = state code)
 */
function getStateFromGSTIN(gstin) {
  if (!gstin || gstin.length < 2) return '';
  const stateCode = gstin.substring(0, 2);
  return GST_STATE_CODES[stateCode] || '';
}

/**
 * Normalize state name for comparison
 */
function normalizeStateName(state) {
  if (!state) return '';
  return String(state).trim().toLowerCase();
}

/**
 * Process Flipkart raw file and generate all sheets
 * @param {Buffer} rawFileBuffer - Raw Flipkart Excel file buffer
 * @param {Array} skuData - Array of {SKU, FG} objects
 * @param {Array} stateConfigData - Array of {States, 'Amazon Pay Ledger', 'Invoice No.'} objects
 * @param {string} brandName - Brand name
 * @param {string} date - Date string (Month-YYYY)
 * @returns {Object} - { workingFileData, pivotData, afterPivotData, outputWorkbook }
 */
async function processFlipkartMacros(rawFileBuffer, skuData, stateConfigData, brandName, date) {
  console.log('=== FLIPKART MACROS PROCESSING ===');
  console.log(`Brand: ${brandName}, Date: ${date}`);

  // Build SKU lookup map
  const skuMap = {};
  if (skuData && Array.isArray(skuData)) {
    for (const item of skuData) {
      const sku = String(item.SKU || item.salesPortalSku || '').trim();
      const fg = item.FG || item.tallyNewSku || '';
      if (sku) {
        skuMap[sku] = fg;
      }
    }
  }
  console.log(`SKU map loaded with ${Object.keys(skuMap).length} entries`);

  // Build state config lookup map (by normalized state name)
const stateConfigMap = {};
console.log("state condig dataaaa",stateConfigData);
if (stateConfigData && Array.isArray(stateConfigData)) {
  for (const item of stateConfigData) {
    console.log('STATE CONFIG ROW:', item);
    console.log('AVAILABLE KEYS:', Object.keys(item));

    const stateName = normalizeStateName(item.States || item.states);

    const ledger =
      item['Flipkart Pay Ledger'] ||
      item['Flipkart pay ledger'] ||
      '';

    console.log('STATE → LEDGER MAP:', stateName, '=>', ledger);

    if (stateName) {
      stateConfigMap[stateName] = {
        tallyLedger: ledger,
        invoiceNo:
          item['Invoice No.'] ||
          item['Invoice No'] ||
          item['invoice no.'] ||
          ''
      };
    }
  }
}

  console.log(`State config map loaded with ${Object.keys(stateConfigMap).length} entries`);
  console.log("State config map",  stateConfigMap);





  // Read raw file
  const workbook = XLSX.read(rawFileBuffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  if (!worksheet) {
    throw new Error('No worksheet found in the uploaded file');
  }

  // Convert to JSON
  const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: null });
  console.log(`Raw data loaded: ${rawData.length} rows`);

  if (rawData.length === 0) {
    throw new Error('Uploaded file has no data rows');
  }

  // Track missing SKUs
  const missingSKUs = new Set();

  // Process working file data
  const workingFileData = [];
  const mainReportData = []; // Cleaned version of raw

  for (const row of rawData) {
    // Get Event Type for filtering
    const eventTypeRaw = String(row['Event Type'] || '').trim();
    const eventSubTypeRaw = String(row['Event Sub Type'] || '').trim();

    const eventType = eventTypeRaw.toLowerCase();
    const eventSubType = eventSubTypeRaw.toLowerCase();

// allow only Sale or Return in BOTH columns
    const validEventType =
        eventType === 'sale' || eventType === 'return';

    const validEventSubType =
        eventSubType === 'sale' || eventSubType === 'return';

// if either column is not Sale/Return → skip row
    if (!validEventType || !validEventSubType) {
      continue;
    }

// Return if ANY column says Return
    const isReturn = eventType === 'return' || eventSubType === 'return';

    // Clean SKU
    const rawSku = row['SKU'] || '';
    const cleanedSku = cleanSKU(rawSku);

    // Lookup FG from SKU map
    const fg = skuMap[cleanedSku];
    if (!fg && cleanedSku) {
      missingSKUs.add(cleanedSku);
    }

    // Get Seller State from GSTIN
    const sellerGstin = String(row['Seller GSTIN'] || '').trim();
    const sellerState = getStateFromGSTIN(sellerGstin);

    // Get Customer Delivery State
    const customerDeliveryState = String(row["Customer's Delivery State"] || '').trim();

    // Lookup Tally Ledger and Invoice No from state config
    const normalizedDeliveryState = normalizeStateName(customerDeliveryState);
    const stateConfig = stateConfigMap[normalizedDeliveryState] || {};
    const tallyLedgers = stateConfig.tallyLedger || '';
    const finalInvoiceNo = stateConfig.invoiceNo || '';

    // Get raw values
    const priceAfterDiscount = safeNumber(row['Price after discount (Price before discount-Total discount)']);
    const shippingCharges = safeNumber(row['Shipping Charges']);
    const itemQuantity = safeNumber(row['Item Quantity']);
    const igstRate = safeNumber(row['IGST Rate']);
    const cgstRate = safeNumber(row['CGST Rate']);

    // Compute derived columns
    // Final Price after discount (negative if Return)
    const finalPriceAfterDiscount = isReturn ? -Math.abs(priceAfterDiscount) : priceAfterDiscount;
    
    // Final Shipping Charges (negative if Return)
    const finalShippingCharges = isReturn ? -Math.abs(shippingCharges) : shippingCharges;

    // Final Item Quantity (negative if Return)
    const finalItemQuantity = isReturn ? -Math.abs(itemQuantity) : itemQuantity;

    // Final GST rate = IGST Rate > 0 ? IGST Rate : CGST Rate
    const finalGstRate = igstRate > 0 ? igstRate : cgstRate;

    // Conversion rate = Final GST rate != 12 ? 1.18 : 1.12
    const conversionRate = finalGstRate !== 12 ? 1.18 : 1.12;

    // Final Taxable sales value = Final Price after discount / Conversion rate
    // Final Taxable sales value = Final Price after discount / Conversion rate
    const finalTaxableSalesValue = Math.round(finalPriceAfterDiscount / conversionRate);


    // Final Shipping Taxable value = Final Shipping Charges / Conversion rate
    const finalShippingTaxableValue = finalShippingCharges / conversionRate;

    // Intra-state vs Inter-state
    const isIntraState = normalizeStateName(sellerState) === normalizeStateName(customerDeliveryState);

    // Tax calculations
    let finalCgstTaxable = 0;
    let finalSgstTaxable = 0;
    let finalIgstTaxable = 0;
    let finalCgstShipping = 0;
    let finalSgstShipping = 0;
    let finalIgstShipping = 0;

    if (isIntraState) {
      // Intra-state: CGST and SGST
      finalCgstTaxable = finalTaxableSalesValue * (finalGstRate / 100);
      finalSgstTaxable = finalTaxableSalesValue * (finalGstRate / 100);
      finalCgstShipping = finalShippingTaxableValue * (finalGstRate / 100);
      finalSgstShipping = finalShippingTaxableValue * (finalGstRate / 100);
    } else {
      // Inter-state: IGST
      finalIgstTaxable = finalTaxableSalesValue * (finalGstRate / 100);
      finalIgstShipping = finalShippingTaxableValue * (finalGstRate / 100);
    }

    // Build working file row
    const workingRow = {
      seller_gstin: sellerGstin,
      seller_state: sellerState,
      order_id: row['Order ID'] || null,
      order_item_id: row['Order Item ID'] || null,
      product_title: row['Product Title/Description'] || null,
      fsn: row['FSN'] || null,
      sku: cleanedSku,
      fg: fg || null,
      hsn_code: row['HSN Code'] || null,
      event_type: eventType,
      event_sub_type: row['Event Sub Type'] || null,
      order_type: row['Order Type'] || null,
      fulfilment_type: row['Fulfilment Type'] || null,
      order_date: row['Order Date'] || null,
      order_approval_date: row['Order Approval Date'] || null,
      item_quantity: finalItemQuantity,
      order_shipped_from_state: row['Order Shipped From (State)'] || null,
      warehouse_id: row['Warehouse ID'] || null,
      price_before_discount: safeNumber(row['Price before discount']),
      total_discount: safeNumber(row['Total Discount']),
      seller_share: safeNumber(row['Seller Share']),
      bank_offer_share: safeNumber(row['Bank Offer Share']),
      price_after_discount: priceAfterDiscount,
      shipping_charges: shippingCharges,
      final_price_after_discount: finalPriceAfterDiscount,
      final_shipping_charges: finalShippingCharges,
      final_taxable_sales_value: finalTaxableSalesValue,
      final_shipping_taxable_value: finalShippingTaxableValue,
      final_cgst_taxable: finalCgstTaxable,
      final_sgst_taxable: finalSgstTaxable,
      final_igst_taxable: finalIgstTaxable,
      final_cgst_shipping: finalCgstShipping,
      final_sgst_shipping: finalSgstShipping,
      final_igst_shipping: finalIgstShipping,
      final_invoice_amount: safeNumber(row['Final Invoice Amount (Price after discount+Shipping Charges)']),
      tax_type: row['Type of tax'] || null,
      taxable_value: safeNumber(row['Taxable Value (Final Invoice Amount -Taxes)']),
      cst_rate: safeNumber(row['CST Rate']),
      cst_amount: safeNumber(row['CST Amount']),
      vat_rate: safeNumber(row['VAT Rate']),
      vat_amount: safeNumber(row['VAT Amount']),
      luxury_cess_rate: safeNumber(row['Luxury Cess Rate']),
      luxury_cess_amount: safeNumber(row['Luxury Cess Amount']),
      conversion_rate: conversionRate,
      final_gst_rate: finalGstRate,
      igst_rate: igstRate,
      igst_amount: safeNumber(row['IGST Amount']),
      cgst_rate: cgstRate,
      cgst_amount: safeNumber(row['CGST Amount']),
      sgst_rate: safeNumber(row['SGST Rate (or UTGST as applicable)']),
      sgst_amount: safeNumber(row['SGST Amount (Or UTGST as applicable)']),
      tcs_igst_rate: safeNumber(row['TCS IGST Rate']),
      tcs_igst_amount: safeNumber(row['TCS IGST Amount']),
      tcs_cgst_rate: safeNumber(row['TCS CGST Rate']),
      tcs_cgst_amount: safeNumber(row['TCS CGST Amount']),
      tcs_sgst_rate: safeNumber(row['TCS SGST Rate']),
      tcs_sgst_amount: safeNumber(row['TCS SGST Amount']),
      total_tcs_deducted: safeNumber(row['Total TCS Deducted']),
      buyer_invoice_id: row['Buyer Invoice ID'] || null,
      buyer_invoice_date: row['Buyer Invoice Date'] || null,
      buyer_invoice_amount: safeNumber(row['Buyer Invoice Amount']),
      customer_billing_pincode: row["Customer's Billing Pincode"] || null,
      customer_billing_state: row["Customer's Billing State"] || null,
      customer_delivery_pincode: row["Customer's Delivery Pincode"] || null,
      customer_delivery_state: customerDeliveryState,
      tally_ledgers: tallyLedgers,
      final_invoice_no: finalInvoiceNo,
      usual_price: safeNumber(row['Usual Price']),
      is_shopsy_order: row['Is Shopsy Order?'] === 'Yes' || row['Is Shopsy Order?'] === true,
      tds_rate: safeNumber(row['TDS Rate']),
      tds_amount: safeNumber(row['TDS Amount']),
      irn: row['IRN'] || null,
      business_name: row['Business Name'] || null,
      business_gst_number: row['Business GST Number'] || null,
      beneficiary_name: row['Beneficiary Name'] || null,
      imei: row['IMEI'] || null
    };

    workingFileData.push(workingRow);

    // Build main report row (cleaned raw data)
    const mainReportRow = {
      'Seller GSTIN': sellerGstin,
      'Seller State': sellerState,
      'Order ID': row['Order ID'],
      'Order Item ID': row['Order Item ID'],
      'Product Title/Description': row['Product Title/Description'],
      'FSN': row['FSN'],
      'SKU': cleanedSku,
      'FG': fg || '',
      'HSN Code': row['HSN Code'],
      'Event Type': eventType,
      'Event Sub Type': row['Event Sub Type'],
      'Order Type': row['Order Type'],
      'Fulfilment Type': row['Fulfilment Type'],
      'Order Date': row['Order Date'],
      'Order Approval Date': row['Order Approval Date'],
      'Item Quantity': finalItemQuantity,
      'Order Shipped From (State)': row['Order Shipped From (State)'],
      'Warehouse ID': row['Warehouse ID'],
      'Price before discount': safeNumber(row['Price before discount']),
      'Total Discount': safeNumber(row['Total Discount']),
      'Seller Share': safeNumber(row['Seller Share']),
      'Bank Offer Share': safeNumber(row['Bank Offer Share']),
      'Price after discount': priceAfterDiscount,
      'Shipping Charges': shippingCharges,
      'Final -Price after discount': finalPriceAfterDiscount,
      'Final-Shipping Charges': finalShippingCharges,
      'Final Taxable sales value': finalTaxableSalesValue,
      'Final Shipping Taxable value': finalShippingTaxableValue,
      'Final CGST on Taxable value': finalCgstTaxable,
      'Final SGST on Taxable value': finalSgstTaxable,
      'Final IGST on Taxable value': finalIgstTaxable,
      'Final CGST on Shipping value': finalCgstShipping,
      'Final SGST on Shipping value': finalSgstShipping,
      'Final IGST on Shipping value': finalIgstShipping,
      'Final Invoice Amount': safeNumber(row['Final Invoice Amount (Price after discount+Shipping Charges)']),
      'Type of tax': row['Type of tax'],
      'Taxable Value': safeNumber(row['Taxable Value (Final Invoice Amount -Taxes)']),
      'CST Rate': safeNumber(row['CST Rate']),
      'CST Amount': safeNumber(row['CST Amount']),
      'VAT Rate': safeNumber(row['VAT Rate']),
      'VAT Amount': safeNumber(row['VAT Amount']),
      'Luxury Cess Rate': safeNumber(row['Luxury Cess Rate']),
      'Luxury Cess Amount': safeNumber(row['Luxury Cess Amount']),
      'Conversion rate': conversionRate,
      'Final GST rate': finalGstRate,
      'IGST Rate': igstRate,
      'IGST Amount': safeNumber(row['IGST Amount']),
      'CGST Rate': cgstRate,
      'CGST Amount': safeNumber(row['CGST Amount']),
      'SGST Rate': safeNumber(row['SGST Rate (or UTGST as applicable)']),
      'SGST Amount': safeNumber(row['SGST Amount (Or UTGST as applicable)']),
      'TCS IGST Rate': safeNumber(row['TCS IGST Rate']),
      'TCS IGST Amount': safeNumber(row['TCS IGST Amount']),
      'TCS CGST Rate': safeNumber(row['TCS CGST Rate']),
      'TCS CGST Amount': safeNumber(row['TCS CGST Amount']),
      'TCS SGST Rate': safeNumber(row['TCS SGST Rate']),
      'TCS SGST Amount': safeNumber(row['TCS SGST Amount']),
      'Total TCS Deducted': safeNumber(row['Total TCS Deducted']),
      'Buyer Invoice ID': row['Buyer Invoice ID'],
      'Buyer Invoice Date': row['Buyer Invoice Date'],
      'Buyer Invoice Amount': safeNumber(row['Buyer Invoice Amount']),
      "Customer's Billing Pincode": row["Customer's Billing Pincode"],
      "Customer's Billing State": row["Customer's Billing State"],
      "Customer's Delivery Pincode": row["Customer's Delivery Pincode"],
      "Customer's Delivery State": customerDeliveryState,
      'Tally ledgers': tallyLedgers,
      'Final Invoice No.': finalInvoiceNo,
      'Usual Price': safeNumber(row['Usual Price']),
      'Is Shopsy Order?': row['Is Shopsy Order?'],
      'TDS Rate': safeNumber(row['TDS Rate']),
      'TDS Amount': safeNumber(row['TDS Amount']),
      'IRN': row['IRN'],
      'Business Name': row['Business Name'],
      'Business GST Number': row['Business GST Number'],
      'Beneficiary Name': row['Beneficiary Name'],
      'IMEI': row['IMEI']
    };

    mainReportData.push(mainReportRow);
  }

  // Check for missing SKUs
  if (missingSKUs.size > 0) {
    const error = new Error(`Some SKUs are missing from the database: ${Array.from(missingSKUs).join(', ')}`);
    error.missingSKUs = Array.from(missingSKUs);
    throw error;
  }

  console.log(`Working file data: ${workingFileData.length} rows`);

  // Generate Pivot
  const pivotMap = {};

  for (const row of workingFileData) {
    const key = JSON.stringify({
      seller_gstin: row.seller_gstin || '',
      tally_ledgers: row.tally_ledgers || '',
      final_invoice_no: row.final_invoice_no || '',
      fg: row.fg || ''
    });

    if (!pivotMap[key]) {
      pivotMap[key] = {
        seller_gstin: row.seller_gstin,
        tally_ledgers: row.tally_ledgers,
        final_invoice_no: row.final_invoice_no,
        fg: row.fg,
        sum_of_item_quantity: 0,
        sum_of_final_taxable_sales_value: 0,
        sum_of_final_cgst_taxable: 0,
        sum_of_final_sgst_taxable: 0,
        sum_of_final_igst_taxable: 0,
        sum_of_final_shipping_taxable_value: 0,
        sum_of_final_cgst_shipping: 0,
        sum_of_final_sgst_shipping: 0,
        sum_of_final_igst_shipping: 0
      };
    }

    pivotMap[key].sum_of_item_quantity += safeNumber(row.item_quantity);
    pivotMap[key].sum_of_final_taxable_sales_value += safeNumber(row.final_taxable_sales_value);
    pivotMap[key].sum_of_final_cgst_taxable += safeNumber(row.final_cgst_taxable);
    pivotMap[key].sum_of_final_sgst_taxable += safeNumber(row.final_sgst_taxable);
    pivotMap[key].sum_of_final_igst_taxable += safeNumber(row.final_igst_taxable);
    pivotMap[key].sum_of_final_shipping_taxable_value += safeNumber(row.final_shipping_taxable_value);
    pivotMap[key].sum_of_final_cgst_shipping += safeNumber(row.final_cgst_shipping);
    pivotMap[key].sum_of_final_sgst_shipping += safeNumber(row.final_sgst_shipping);
    pivotMap[key].sum_of_final_igst_shipping += safeNumber(row.final_igst_shipping);
  }

  const pivotData = Object.values(pivotMap);
  console.log(`Pivot data: ${pivotData.length} rows`);

  // Generate After-Pivot (add Rate column)
  const afterPivotData = pivotData.map(row => ({
    seller_gstin: row.seller_gstin,
    tally_ledgers: row.tally_ledgers,
    invoice_no: row.final_invoice_no,
    fg: row.fg,
    quantity: row.sum_of_item_quantity,
    rate: row.sum_of_item_quantity !== 0 ? row.sum_of_final_taxable_sales_value / row.sum_of_item_quantity : 0,
    taxable_sales_value: row.sum_of_final_taxable_sales_value,
    cgst_sales_amount: row.sum_of_final_cgst_taxable,
    sgst_sales_amount: row.sum_of_final_sgst_taxable,
    igst_sales_amount: row.sum_of_final_igst_taxable,
    shipping_taxable_value: row.sum_of_final_shipping_taxable_value,
    cgst_shipping_amount: row.sum_of_final_cgst_shipping,
    sgst_shipping_amount: row.sum_of_final_sgst_shipping,
    igst_shipping_amount: row.sum_of_final_igst_shipping
  }));

  console.log(`After-pivot data: ${afterPivotData.length} rows`);

  // Create output workbook with 6 sheets
  const outputWorkbook = XLSX.utils.book_new();

  // 1. main-report (cleaned & filtered raw)
  const mainReportSheet = XLSX.utils.json_to_sheet(mainReportData);
  XLSX.utils.book_append_sheet(outputWorkbook, mainReportSheet, 'main-report');

  // 2. working-file
  const workingFileSheetData = workingFileData.map(row => ({
    'Seller GSTIN': row.seller_gstin,
    'Seller State': row.seller_state,
    'Order ID': row.order_id,
    'Order Item ID': row.order_item_id,
    'Product Title': row.product_title,
    'FSN': row.fsn,
    'SKU': row.sku,
    'FG': row.fg,
    'HSN Code': row.hsn_code,
    'Event Type': row.event_type,
    'Event Sub Type': row.event_sub_type,
    'Order Type': row.order_type,
    'Fulfilment Type': row.fulfilment_type,
    'Order Date': row.order_date,
    'Order Approval Date': row.order_approval_date,
    'Item Quantity': row.item_quantity,
    'Order Shipped From State': row.order_shipped_from_state,
    'Warehouse ID': row.warehouse_id,
    'Price Before Discount': row.price_before_discount,
    'Total Discount': row.total_discount,
    'Seller Share': row.seller_share,
    'Bank Offer Share': row.bank_offer_share,
    'Price After Discount': row.price_after_discount,
    'Shipping Charges': row.shipping_charges,
    'Final -Price after discount': row.final_price_after_discount,
    'Final-Shipping Charges': row.final_shipping_charges,
    'Final Taxable sales value': row.final_taxable_sales_value,
    'Final Shipping Taxable value': row.final_shipping_taxable_value,
    'Final CGST on Taxable value': row.final_cgst_taxable,
    'Final SGST on Taxable value': row.final_sgst_taxable,
    'Final IGST on Taxable value': row.final_igst_taxable,
    'Final CGST on Shipping value': row.final_cgst_shipping,
    'Final SGST on Shipping value': row.final_sgst_shipping,
    'Final IGST on Shipping value': row.final_igst_shipping,
    'Final Invoice Amount': row.final_invoice_amount,
    'Tax Type': row.tax_type,
    'Taxable Value': row.taxable_value,
    'Conversion Rate': row.conversion_rate,
    'Final GST Rate': row.final_gst_rate,
    'IGST Rate': row.igst_rate,
    'IGST Amount': row.igst_amount,
    'CGST Rate': row.cgst_rate,
    'CGST Amount': row.cgst_amount,
    'SGST Rate': row.sgst_rate,
    'SGST Amount': row.sgst_amount,
    'TCS IGST Rate': row.tcs_igst_rate,
    'TCS IGST Amount': row.tcs_igst_amount,
    'TCS CGST Rate': row.tcs_cgst_rate,
    'TCS CGST Amount': row.tcs_cgst_amount,
    'TCS SGST Rate': row.tcs_sgst_rate,
    'TCS SGST Amount': row.tcs_sgst_amount,
    'Total TCS Deducted': row.total_tcs_deducted,
    'Buyer Invoice ID': row.buyer_invoice_id,
    'Buyer Invoice Date': row.buyer_invoice_date,
    'Buyer Invoice Amount': row.buyer_invoice_amount,
    "Customer's Billing Pincode": row.customer_billing_pincode,
    "Customer's Billing State": row.customer_billing_state,
    "Customer's Delivery Pincode": row.customer_delivery_pincode,
    "Customer's Delivery State": row.customer_delivery_state,
    'Tally Ledgers': row.tally_ledgers,
    'Final Invoice No.': row.final_invoice_no,
    'Usual Price': row.usual_price,
    'Is Shopsy Order?': row.is_shopsy_order,
    'TDS Rate': row.tds_rate,
    'TDS Amount': row.tds_amount,
    'IRN': row.irn,
    'Business Name': row.business_name,
    'Business GST Number': row.business_gst_number,
    'Beneficiary Name': row.beneficiary_name,
    'IMEI': row.imei
  }));
  const workingFileSheet = XLSX.utils.json_to_sheet(workingFileSheetData);
  XLSX.utils.book_append_sheet(outputWorkbook, workingFileSheet, 'working-file');

  // 3. pivot
  const pivotSheetData = pivotData.map(row => ({
    'Seller GSTIN': row.seller_gstin,
    'Tally ledgers': row.tally_ledgers,
    'Final Invoice No.': row.final_invoice_no,
    'FG': row.fg,
    'Sum of Item Quantity': row.sum_of_item_quantity,
    'Sum of Final Taxable sales value': row.sum_of_final_taxable_sales_value,
    'Sum of Final CGST on Taxable value': row.sum_of_final_cgst_taxable,
    'Sum of Final SGST on Taxable value': row.sum_of_final_sgst_taxable,
    'Sum of Final IGST on Taxable value': row.sum_of_final_igst_taxable,
    'Sum of Final Shipping Taxable value': row.sum_of_final_shipping_taxable_value,
    'Sum of Final CGST on Shipping value': row.sum_of_final_cgst_shipping,
    'Sum of Final SGST on Shipping value': row.sum_of_final_sgst_shipping,
    'Sum of Final IGST on Shipping value': row.sum_of_final_igst_shipping
  }));
  const pivotSheet = XLSX.utils.json_to_sheet(pivotSheetData);
  XLSX.utils.book_append_sheet(outputWorkbook, pivotSheet, 'pivot');

  // 4. after-pivot
  const afterPivotSheetData = afterPivotData.map(row => ({
    'Seller GSTIN': row.seller_gstin,
    'Tally ledgers': row.tally_ledgers,
    'Final Invoice No.': row.invoice_no,
    'FG': row.fg,
    'Quantity': row.quantity,
    'Rate': row.rate,
    'Taxable Sales Value': row.taxable_sales_value,
    'CGST Sales Amount': row.cgst_sales_amount,
    'SGST Sales Amount': row.sgst_sales_amount,
    'IGST Sales Amount': row.igst_sales_amount,
    'Shipping Taxable Value': row.shipping_taxable_value,
    'CGST Shipping Amount': row.cgst_shipping_amount,
    'SGST Shipping Amount': row.sgst_shipping_amount,
    'IGST Shipping Amount': row.igst_shipping_amount
  }));
  const afterPivotSheet = XLSX.utils.json_to_sheet(afterPivotSheetData);
  XLSX.utils.book_append_sheet(outputWorkbook, afterPivotSheet, 'after-pivot');

  // 5. source-sku
  const sourceSkuSheetData = (skuData || []).map(item => ({
    'SKU': item.SKU || item.salesPortalSku || '',
    'FG': item.FG || item.tallyNewSku || ''
  }));
  const sourceSkuSheet = XLSX.utils.json_to_sheet(sourceSkuSheetData);
  XLSX.utils.book_append_sheet(outputWorkbook, sourceSkuSheet, 'source-sku');

  // 6. source-state
  const sourceStateSheetData = (stateConfigData || []).map(item => ({
    'States': item.States || item.states || '',
    'Flipkart Pay Ledger': item['Amazon Pay Ledger'] || item['amazon pay ledger'] || '',
    'Invoice No.': item['Invoice No.'] || item['Invoice No'] || ''
  }));
  const sourceStateSheet = XLSX.utils.json_to_sheet(sourceStateSheetData);
  XLSX.utils.book_append_sheet(outputWorkbook, sourceStateSheet, 'source-state');

  console.log('=== FLIPKART MACROS PROCESSING COMPLETE ===');
  console.log(`Output workbook sheets: ${outputWorkbook.SheetNames.join(', ')}`);

  return {
    workingFileData,
    pivotData,
    afterPivotData,
    outputWorkbook
  };
}

module.exports = {
  processFlipkartMacros
};




