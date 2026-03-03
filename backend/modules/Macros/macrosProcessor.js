const XLSX = require('xlsx-js-style');
const ExcelJS = require('exceljs');

async function processMacros(
  rawFileBuffer,
  skuFileBuffer,
  brandName,
  date,
  sourceSheetData,
  stateConfigData,
  useInventory
) {
  try {
    if (!rawFileBuffer) {
      throw new Error('Raw file buffer is required');
    }

    // ================================
    // STEP 1: READ RAW FILE → JSON
    // ================================
    const rawWorkbook = XLSX.read(rawFileBuffer, { type: 'buffer' });
    const firstSheetName = rawWorkbook.SheetNames[0];
    const rawSheet = rawWorkbook.Sheets[firstSheetName];

    const rawJson = XLSX.utils.sheet_to_json(rawSheet, {
      defval: null
    });

    if (!rawJson.length) {
      throw new Error('Raw sheet is empty');
    }

    // ================================
    // STEP 2: FIND REQUIRED COLUMNS
    // ================================
    const headers = Object.keys(rawJson[0]);

    const transactionColumn = headers.find(
      h => h.toLowerCase().trim() === 'transaction type'
    );

    const quantityColumn = headers.find(
      h => h.toLowerCase().trim() === 'quantity'
    );

    const sellerGstinColumn = headers.find(
      h => h.toLowerCase().trim() === 'seller gstin'
    );

    if (!transactionColumn) throw new Error('Transaction Type column not found');
    if (!quantityColumn) throw new Error('Quantity column not found');
    if (!sellerGstinColumn) throw new Error('Seller Gstin column not found');

    // ================================
    // STEP 3: FILTER Shipment & Refund
    // ================================
    const filteredRows = rawJson.filter(row => {
      const type = row[transactionColumn];
      return type === 'Shipment' || type === 'Refund';
    });

    // ================================
    // STEP 4: MAKE REFUND QUANTITY NEGATIVE
    // ================================
    filteredRows.forEach(row => {
      if (row[transactionColumn] === 'Refund') {
        const qty = parseFloat(row[quantityColumn] || 0);
        row[quantityColumn] = -Math.abs(qty);
      }
    });

    // ================================
    // STEP 4.1: INSERT 10 NEW COLUMNS
    // ================================
    const cessIndex = headers.findIndex(
      h => h.toLowerCase().trim() === 'compensatory cess tax'
    );

    if (cessIndex === -1) {
      throw new Error('Compensatory Cess Tax column not found');
    }

    const newColumns = [
      'Final Tax rate',
      'Final Taxable Sales Value',
      'Final Taxable Shipping Value',
      'Final CGST Tax',
      'Final SGST Tax',
      'Final IGST Tax',
      'Final Shipping CGST Tax',
      'Final Shipping SGST Tax',
      'Final Shipping IGST Tax',
      'Final Amount Receivable'
    ];

    // Insert new columns after Compensatory Cess Tax
    headers.splice(cessIndex + 1, 0, ...newColumns);

    // Add empty values for new columns in each row
    filteredRows.forEach(row => {
      newColumns.forEach(col => {
        row[col] = null;
      });
    });

// ================================
// STEP 4.2: INSERT STATE & INVOICE COLUMNS
// ================================

// Find Ship To State index
const shipToStateIndex = headers.findIndex(
  h => h.toLowerCase().trim() === 'ship to state'
);

if (shipToStateIndex === -1) {
  throw new Error('Ship To State column not found');
}

// Columns to insert
const stateInvoiceColumns = [
  'Ship To State Tally Ledger',
  'Final Invoice No.'
];

// Insert after Ship To State
headers.splice(shipToStateIndex + 1, 0, ...stateInvoiceColumns);

// Add empty values in each row
filteredRows.forEach(row => {
  stateInvoiceColumns.forEach(col => {
    row[col] = null;
  });
});


// ================================
// STEP 4.3: INSERT FG COLUMN IF INVENTORY TRUE
// ================================

if (useInventory === true) {

  const skuIndex = headers.findIndex(
    h => h.toLowerCase().trim() === 'sku'
  );

  if (skuIndex === -1) {
    throw new Error('Sku column not found while adding FG');
  }

  headers.splice(skuIndex + 1, 0, 'FG');

  filteredRows.forEach(row => {
    row['FG'] = null;
  });

}

// ================================
// STEP 4.4: MAP STATE CONFIG DATA
// ================================

if (Array.isArray(stateConfigData) && stateConfigData.length > 0) {

  // Create lookup map (case-insensitive)
  const stateMap = {};

  stateConfigData.forEach(item => {
    if (item.States) {
      const key = item.States.toString().trim().toLowerCase();
      stateMap[key] = {
        ledger: item['Amazon Pay Ledger'] || null,
        invoice: item['Invoice No.'] || null
      };
    }
  });

  // Map each row
  filteredRows.forEach(row => {

    const shipState = row['Ship To State'];

    if (shipState) {
      const lookupKey = shipState.toString().trim().toLowerCase();

      if (stateMap[lookupKey]) {
        row['Ship To State Tally Ledger'] = stateMap[lookupKey].ledger;
        row['Final Invoice No.'] = stateMap[lookupKey].invoice;
      } else {
        row['Ship To State Tally Ledger'] = null;
        row['Final Invoice No.'] = null;
      }
    } else {
      row['Ship To State Tally Ledger'] = null;
      row['Final Invoice No.'] = null;
    }

  });

}

// ==================================
// STEP 4.5: MAP FG FROM sourceSheetData (DEBUG MODE)
// ==================================
if (useInventory === true && Array.isArray(sourceSheetData)) {

  const normalizeSKU = (sku) => {
    if (!sku) return '';
    return sku
      .toString()
      .replace(/"/g, '')
      .replace(/\r\n|\n|\r/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  };

  // Detect SKU Column
  const possibleSkuColumns = [
    'SKU',
    'Sku',
    'sku',
    'Seller SKU',
    'seller sku',
    'Item SKU'
  ];

  let detectedSkuColumn = null;
  const sampleRow = filteredRows[0];

  for (let col of possibleSkuColumns) {
    if (sampleRow.hasOwnProperty(col)) {
      detectedSkuColumn = col;
      break;
    }
  }

  if (!detectedSkuColumn) {
    console.log("❌ SKU Column Not Found in Sheet");
    return;
  }

  console.log("✅ Using SKU Column:", detectedSkuColumn);

  // Create SKU Map
  const skuMap = {};
  sourceSheetData.forEach(item => {
    const key = normalizeSKU(item.SKU);
    if (key) skuMap[key] = item.FG || null;
  });

  // Map FG
  filteredRows.forEach(row => {
    const rawSKU = row[detectedSkuColumn];
    const lookupKey = normalizeSKU(rawSKU);

    row['FG'] = skuMap[lookupKey] || null;
  });

}

filteredRows.forEach(row => {

  const cgstRate = Number(row['Cgst Rate'] || 0);
  const igstRate = Number(row['Igst Rate'] || 0);
  const sgstRate = Number(row['Sgst Rate'] || 0);

  const finalTaxRate = cgstRate + igstRate;

  const shippingValue =
    Number(row['Shipping Amount Basis'] || 0) +
    Number(row['Gift Wrap Amount Basis'] || 0) +
    Number(row['Gift Wrap Promo Discount Basis'] || 0) +
    Number(row['Shipping Promo Discount Basis'] || 0);

  const taxableSales =
    Number(row['Tax Exclusive Gross'] || 0) - shippingValue;

  const isIntraState =
    row['Ship From State'] === row['Ship To State'];

  row['Final Tax rate'] = finalTaxRate;
  row['Final Taxable Shipping Value'] = shippingValue;
  row['Final Taxable Sales Value'] = taxableSales;

  
  row['Final CGST Tax'] =
    isIntraState ? taxableSales * cgstRate : 0;
  
  row['Final SGST Tax'] =
    isIntraState ? taxableSales * sgstRate : 0;
  
  row['Final IGST Tax'] =
    !isIntraState ? taxableSales * igstRate : 0;
  
  row['Final Shipping CGST Tax'] =
    isIntraState ? shippingValue * cgstRate : 0;
  
  row['Final Shipping SGST Tax'] =
    isIntraState ? shippingValue * sgstRate : 0;
  
  row['Final Shipping IGST Tax'] =
    !isIntraState ? shippingValue * igstRate : 0;

  const tcsTotal =
    Number(row['Tcs Cgst Amount'] || 0) +
    Number(row['Tcs Sgst Amount'] || 0) +
    Number(row['Tcs Igst Amount'] || 0);

  row['Final Amount Receivable'] =
    taxableSales +
    shippingValue +
    row['Final CGST Tax'] +
    row['Final SGST Tax'] +
    row['Final IGST Tax'] +
    row['Final Shipping CGST Tax'] +
    row['Final Shipping SGST Tax'] +
    row['Final Shipping IGST Tax'] -
    tcsTotal;

});

// ================================
// STEP 5: CREATE UPDATED RAW WORKBOOK WITH FORMULAS
// ================================
const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('updated raw sheet');

// Set columns
worksheet.columns = headers.map(header => ({
  header: header,
  key: header,
  width: 22
}));

// Helper function to get Excel column letter
function getColumnLetter(colNumber) {
  let temp, letter = '';
  while (colNumber > 0) {
    temp = (colNumber - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colNumber = (colNumber - temp - 1) / 26;
  }
  return letter;
}

// Map header → column index
const headerIndexMap = {};
headers.forEach((header, index) => {
  headerIndexMap[header] = index + 1;
});

// Required columns check
const requiredColumns = [
  'Cgst Rate',
  'Igst Rate',
  'Shipping Amount Basis',
  'Gift Wrap Amount Basis',
  'Gift Wrap Promo Discount Basis',
  'Shipping Promo Discount Basis',
  'Tax Exclusive Gross',
  'Ship From State',
  'Ship To State',
  'Tcs Cgst Amount',
  'Tcs Sgst Amount',
  'Tcs Igst Amount'
];

requiredColumns.forEach(col => {
  if (!headerIndexMap[col]) {
    throw new Error(`${col} column not found`);
  }
});

// Add rows with formulas
filteredRows.forEach((rowData, rowIndex) => {

  const row = worksheet.addRow(rowData);
  const excelRowNumber = row.number;

  const col = name => getColumnLetter(headerIndexMap[name]);

  const finalTaxRateCol = col('Final Tax rate');
  const finalTaxableShippingCol = col('Final Taxable Shipping Value');
  const finalTaxableSalesCol = col('Final Taxable Sales Value');
  const finalCgstCol = col('Final CGST Tax');
  const finalSgstCol = col('Final SGST Tax');
  const finalIgstCol = col('Final IGST Tax');
  const finalShipCgstCol = col('Final Shipping CGST Tax');
  const finalShipSgstCol = col('Final Shipping SGST Tax');
  const finalShipIgstCol = col('Final Shipping IGST Tax');
  const finalReceivableCol = col('Final Amount Receivable');

  const cgstRateCol = col('Cgst Rate');
  const sgstRateCol = col('Sgst Rate');
  const igstRateCol = col('Igst Rate');
  const shipAmtBasisCol = col('Shipping Amount Basis');
  const giftWrapBasisCol = col('Gift Wrap Amount Basis');
  const giftWrapPromoBasisCol = col('Gift Wrap Promo Discount Basis');
  const shipPromoBasisCol = col('Shipping Promo Discount Basis');
  const taxExclusiveCol = col('Tax Exclusive Gross');
  const shipFromCol = col('Ship From State');
  const shipToCol = col('Ship To State');
  const tcsCgstCol = col('Tcs Cgst Amount');
  const tcsSgstCol = col('Tcs Sgst Amount');
  const tcsIgstCol = col('Tcs Igst Amount');

  // 1️⃣ Final Tax Rate
  worksheet.getCell(`${finalTaxRateCol}${excelRowNumber}`).value = {
    formula: `${cgstRateCol}${excelRowNumber}+${sgstRateCol}${excelRowNumber}+${igstRateCol}${excelRowNumber}`
  };

  // 2️⃣ Final Taxable Shipping Value
  worksheet.getCell(`${finalTaxableShippingCol}${excelRowNumber}`).value = {
    formula: `${shipAmtBasisCol}${excelRowNumber}+${giftWrapBasisCol}${excelRowNumber}+${giftWrapPromoBasisCol}${excelRowNumber}+${shipPromoBasisCol}${excelRowNumber}`
  };

  // 3️⃣ Final Taxable Sales Value
  worksheet.getCell(`${finalTaxableSalesCol}${excelRowNumber}`).value = {
    formula: `${taxExclusiveCol}${excelRowNumber}-${finalTaxableShippingCol}${excelRowNumber}`
  };

  // 4️⃣ Final CGST Tax
  worksheet.getCell(`${finalCgstCol}${excelRowNumber}`).value = {
    formula: `IF(${shipFromCol}${excelRowNumber}=${shipToCol}${excelRowNumber},${finalTaxableSalesCol}${excelRowNumber}*${finalTaxRateCol}${excelRowNumber},0)`
  };

  // 5️⃣ Final SGST Tax
  worksheet.getCell(`${finalSgstCol}${excelRowNumber}`).value = {
    formula: `IF(${shipFromCol}${excelRowNumber}=${shipToCol}${excelRowNumber},${finalTaxableSalesCol}${excelRowNumber}*${finalTaxRateCol}${excelRowNumber},0)`
  };

  // 6️⃣ Final IGST Tax
  worksheet.getCell(`${finalIgstCol}${excelRowNumber}`).value = {
    formula: `IF(${shipFromCol}${excelRowNumber}<>${shipToCol}${excelRowNumber},${finalTaxableSalesCol}${excelRowNumber}*${finalTaxRateCol}${excelRowNumber},0)`
  };

  // 7️⃣ Final Shipping CGST
  worksheet.getCell(`${finalShipCgstCol}${excelRowNumber}`).value = {
    formula: `IF(${shipFromCol}${excelRowNumber}=${shipToCol}${excelRowNumber},${finalTaxableShippingCol}${excelRowNumber}*${finalTaxRateCol}${excelRowNumber},0)`
  };

  // 8️⃣ Final Shipping SGST
  worksheet.getCell(`${finalShipSgstCol}${excelRowNumber}`).value = {
    formula: `IF(${shipFromCol}${excelRowNumber}=${shipToCol}${excelRowNumber},${finalTaxableShippingCol}${excelRowNumber}*${finalTaxRateCol}${excelRowNumber},0)`
  };

  // 9️⃣ Final Shipping IGST
  worksheet.getCell(`${finalShipIgstCol}${excelRowNumber}`).value = {
    formula: `IF(${shipFromCol}${excelRowNumber}<>${shipToCol}${excelRowNumber},${finalTaxableShippingCol}${excelRowNumber}*${finalTaxRateCol}${excelRowNumber},0)`
  };

  // 🔟 Final Amount Receivable
  worksheet.getCell(`${finalReceivableCol}${excelRowNumber}`).value = {
    formula: `
      ${finalTaxableSalesCol}${excelRowNumber}
      +${finalTaxableShippingCol}${excelRowNumber}
      +${finalCgstCol}${excelRowNumber}
      +${finalSgstCol}${excelRowNumber}
      +${finalIgstCol}${excelRowNumber}
      +${finalShipCgstCol}${excelRowNumber}
      +${finalShipSgstCol}${excelRowNumber}
      +${finalShipIgstCol}${excelRowNumber}
      -${tcsCgstCol}${excelRowNumber}
      -${tcsSgstCol}${excelRowNumber}
      -${tcsIgstCol}${excelRowNumber}
    `.replace(/\s+/g, '')
  };

});

// Create separate workbook for pivot (VERY IMPORTANT)
const pivotWorkbook = XLSX.utils.book_new();

// ==================================
// STEP 6: CREATE FINAL PIVOT STRUCTURE
// ==================================

const pivotMap = {};

// filteredRows.forEach(row => {

//   console.log(
//     "Invoice:",
//     row['Final Invoice No.'],
//     "FG:",
//     row['FG'],
//     "Shipping CGST:",
//     row['Final Shipping CGST Tax']
//   );

//   const key = [
//     row['Seller Gstin'] || '',
//     row['Final Invoice No.'] || '',
//     row['Ship To State Tally Ledger'] || '',
//     row['FG'] || ''

//   ].join('|');

  const pivotData = filteredRows.map(row => ({
    'Seller Gstin': row['Seller Gstin'] || '',
    'Final Invoice No.': row['Final Invoice No.'] || '',
    'Ship To State Tally Ledger': row['Ship To State Tally Ledger'] || '',
    'FG': row['FG'] || '',
  
    'Quantity': Number(row['Quantity'] || 0),
    'Final Tax rate':
      Number(row['Cgst Rate'] || 0) +
      Number(row['Sgst Rate'] || 0) +
      Number(row['Igst Rate'] || 0),
  
    'Final Taxable Sales Value': Number(row['Final Taxable Sales Value'] || 0),
    'Final Taxable Shipping Value': Number(row['Final Taxable Shipping Value'] || 0),
    'Final CGST Tax': Number(row['Final CGST Tax'] || 0),
    'Final SGST Tax': Number(row['Final SGST Tax'] || 0),
    'Final IGST Tax': Number(row['Final IGST Tax'] || 0),
    'Final Shipping CGST Tax': Number(row['Final Shipping CGST Tax'] || 0),
    'Final Shipping SGST Tax': Number(row['Final Shipping SGST Tax'] || 0),
    'Final Shipping IGST Tax': Number(row['Final Shipping IGST Tax'] || 0),
    'Tcs Cgst Amount': Number(row['Tcs Cgst Amount'] || 0),
    'Tcs Sgst Amount': Number(row['Tcs Sgst Amount'] || 0),
    'Tcs Igst Amount': Number(row['Tcs Igst Amount'] || 0),
    'Final Amount Receivable': Number(row['Final Amount Receivable'] || 0)
  }));

//   if (!pivotMap[key]) {
//     pivotMap[key] = {
//       'Seller Gstin': row['Seller Gstin'] || '',
//       'Final Invoice No.': row['Final Invoice No.'] || '',
//       'Ship To State Tally Ledger': row['Ship To State Tally Ledger'] || '',
//       'FG': row['FG'] || '',

//       'Quantity': 0,
//       'Final Tax rate': 0,
//       'Final Taxable Sales Value': 0,
//       'Final Taxable Shipping Value': 0,
//       'Final CGST Tax': 0,
//       'Final SGST Tax': 0,
//       'Final IGST Tax': 0,
//       'Final Shipping CGST Tax': 0,
//       'Final Shipping SGST Tax': 0,
//       'Final Shipping IGST Tax': 0,
//       'Tcs Cgst Amount': 0,
//       'Tcs Sgst Amount': 0,
//       'Tcs Igst Amount': 0,
//       'Final Amount Receivable': 0
//     };
//   }

//   pivotMap[key]['Quantity'] += Number(row['Quantity'] || 0);
//   pivotMap[key]['Final Tax rate'] = Number(row['Cgst Rate'] || 0) + Number(row['Sgst Rate'] || 0) + Number(row['Igst Rate'] || 0);

//   pivotMap[key]['Final Taxable Sales Value'] += Number(row['Final Taxable Sales Value'] || 0);
//   pivotMap[key]['Final Taxable Shipping Value'] += Number(row['Final Taxable Shipping Value'] || 0);
//   pivotMap[key]['Final CGST Tax'] += Number(row['Final CGST Tax'] || 0);
//   pivotMap[key]['Final SGST Tax'] += Number(row['Final SGST Tax'] || 0);
//   pivotMap[key]['Final IGST Tax'] += Number(row['Final IGST Tax'] || 0);
//   pivotMap[key]['Final Shipping CGST Tax'] += (Number(row['Final Shipping CGST Tax'])  || 0);
//   pivotMap[key]['Final Shipping SGST Tax'] += (Number(row['Final Shipping SGST Tax'])  || 0);
//   pivotMap[key]['Final Shipping IGST Tax'] += Number(row['Final Shipping IGST Tax'] || 0);
//   pivotMap[key]['Tcs Cgst Amount'] += Number(row['Tcs Cgst Amount'] || 0);
//   pivotMap[key]['Tcs Sgst Amount'] += Number(row['Tcs Sgst Amount'] || 0);
//   pivotMap[key]['Tcs Igst Amount'] += Number(row['Tcs Igst Amount'] || 0);
//   pivotMap[key]['Final Amount Receivable'] += Number(row['Final Amount Receivable'] || 0);
// });

// const pivotData = Object.values(pivotMap);

// pivotData.forEach(row => {

//   const totalTax =
//     Number(row['Final CGST Tax'] || 0) +
//     Number(row['Final SGST Tax'] || 0) +
//     Number(row['Final IGST Tax'] || 0);

//   const taxableValue =
//     Number(row['Final Taxable Sales Value'] || 0);

//   row['Final Tax rate'] =
//     taxableValue !== 0
//       ? Number((totalTax / taxableValue).toFixed(4))
//       : 0;

// });

console.log("Pivot Records Created:", pivotData.length);

// Create XLSX sheet
const pivotSheet = XLSX.utils.json_to_sheet(pivotData);

// Append to pivotWorkbook (NOT ExcelJS workbook)
XLSX.utils.book_append_sheet(
  pivotWorkbook,
  pivotSheet,
  'amazon-b2c-pivot'
);

// ==================================
// STEP 7: CREATE TALLY READY SHEET
// ==================================

function getLastDateOfMonth(dateString) {
  const dateObj = new Date(dateString);
  const lastDay = new Date(
    dateObj.getFullYear(),
    dateObj.getMonth() + 1,
    0
  );
  const dd = String(lastDay.getDate()).padStart(2, '0');
  const mm = String(lastDay.getMonth() + 1).padStart(2, '0');
  const yy = String(lastDay.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

const lastDate = getLastDateOfMonth(date);

const uniqueRates = [
  ...new Set(
    pivotData.map(row => Number(row['Final Tax rate'] || 0))
  )
].filter(rate => rate > 0);

const tallyRows = [];

pivotData.forEach(row => {

  const quantity = Number(row['Quantity'] || 0);
  const taxableValue = Number(row['Final Taxable Sales Value'] || 0);
  const rate = Number(row['Final Tax rate'] || 0);

  const ratePerPiece = quantity !== 0
    ? taxableValue / quantity
    : 0;

  const baseRow = {
    'Vch Date': lastDate,
    'Vch Type': row['Seller Gstin'] || '',
    'Vch No.': row['Final Invoice No.'] || '',
    'Ref No.': row['Final Invoice No.'] || '',
    'Ref Date': lastDate,
    'Party Ledger': row['Ship To State Tally Ledger'] || '',
    'Sales Ledger': 'Amazon Pay Ledger',
    'Stock Item': row['FG'] || '',
    'Quantity': quantity,
    'Rate': rate,
    'Amount': taxableValue,
    'Rate Per Piece': ratePerPiece
  };

  // Initialize dynamic GST columns
  uniqueRates.forEach(r => {
    const halfRate = r / 2;

    baseRow[`CGST ${halfRate}`] = 0;
    baseRow[`SGST ${halfRate}`] = 0;
    baseRow[`IGST ${r}`] = 0;
  });

  // Fill correct tax columns
  if (rate > 0) {

    const halfRate = rate / 2;

    baseRow[`CGST ${halfRate}`] = Number(row['Final CGST Tax'] || 0);
    baseRow[`SGST ${halfRate}`] = Number(row['Final SGST Tax'] || 0);
    baseRow[`IGST ${rate}`] = Number(row['Final IGST Tax'] || 0);

  }

  tallyRows.push(baseRow);

});

const tallySheet = XLSX.utils.json_to_sheet(tallyRows);

XLSX.utils.book_append_sheet(
  pivotWorkbook,
  tallySheet,
  'amazon-b2c-tally-ready'
);

// ==================================
// STEP 8: CREATE SHIPPING TALLY READY SHEET
// ==================================

const shippingUniqueRates = [
  ...new Set(
    pivotData.map(row => Number(row['Final Tax rate'] || 0))
  )
].filter(rate => rate > 0);

const shippingTallyRows = [];

pivotData.forEach(row => {

  const shippingValue = Number(row['Final Taxable Shipping Value'] || 0);
  const rate = Number(row['Final Tax rate'] || 0);

  const shippingRow = {
    'Vch Date': lastDate,
    'Vch Type': row['Seller Gstin'] || '',
    'Vch No.': row['Final Invoice No.'] || '',
    'Ref No.': row['Final Invoice No.'] || '',
    'Ref Date': lastDate,
    'Party Ledger': row['Ship To State Tally Ledger'] || '',
    'Sales Ledger': 'Amazon Pay Ledger',
    'Rate': rate,
    'Amount': shippingValue
  };

  // Initialize dynamic GST columns
  shippingUniqueRates.forEach(r => {

    const halfRate = Number((r / 2).toFixed(4));

    shippingRow[`CGST ${halfRate}`] = 0;
    shippingRow[`SGST ${halfRate}`] = 0;
    shippingRow[`IGST ${r}`] = 0;

  });

  // Fill correct shipping tax values
  if (rate > 0) {

    const halfRate = Number((rate / 2).toFixed(4));

    shippingRow[`CGST ${halfRate}`] +=
      Number(row['Final Shipping CGST Tax'] || 0);

    shippingRow[`SGST ${halfRate}`] +=
      Number(row['Final Shipping SGST Tax'] || 0);

    shippingRow[`IGST ${rate}`] +=
      Number(row['Final Shipping IGST Tax'] || 0);
  }

  shippingTallyRows.push(shippingRow);

});

const shippingSheet = XLSX.utils.json_to_sheet(shippingTallyRows);

XLSX.utils.book_append_sheet(
  pivotWorkbook,
  shippingSheet,
  'amazon-b2c-shipping-tally-ready'
);


// ==================================
// STEP 9: CREATE GSTR HSN SHEET
// ==================================

const gstrMap = {};

filteredRows.forEach((row) => {

  // ---- Safe String Handling ----
  const sellerGstin = String(row['Seller Gstin'] || '').trim();
  const hsn = String(row['Hsn/sac'] || '').trim();

  // ---- Calculate Total Tax Rate ----
  const totalRate =
    Number(row['Cgst Rate'] || 0) +
    Number(row['Sgst Rate'] || 0) +
    Number(row['Igst Rate'] || 0);

  // Fix floating precision issues like 18 vs 18.0000001
  const normalizedRate = Number(totalRate.toFixed(2));

  // ---- Create Grouping Key ----
  const key = `${sellerGstin}|${hsn}|${normalizedRate}`;

  // ---- Create Group If Not Exists ----
  if (!gstrMap[key]) {
    gstrMap[key] = {
      'Seller Gstin': sellerGstin,
      'Hsn/sac': hsn,
      'Rate': normalizedRate,
      'Quantity': 0,
      'Final Taxable Sales Value': 0,
      'Final CGST Tax': 0,
      'Final SGST Tax': 0,
      'Final IGST Tax': 0
    };
  }

  // ---- Add Values To Group ----
  gstrMap[key]['Quantity'] += Number(row['Quantity'] || 0);
  gstrMap[key]['Final Taxable Sales Value'] += Number(row['Final Taxable Sales Value'] || 0);
  gstrMap[key]['Final CGST Tax'] += Number(row['Final CGST Tax'] || 0);
  gstrMap[key]['Final SGST Tax'] += Number(row['Final SGST Tax'] || 0);
  gstrMap[key]['Final IGST Tax'] += Number(row['Final IGST Tax'] || 0);

});

// Convert map to array
const gstrData = Object.values(gstrMap);

console.log("GSTR HSN Records:", gstrData.length);

// ==================================
// CREATE EXCEL SHEET
// ==================================

const gstrSheet = XLSX.utils.json_to_sheet(gstrData);

// Optional: Set column order properly
const columnOrder = [
  'Seller Gstin',
  'Hsn/sac',
  'Rate',
  'Quantity',
  'Final Taxable Sales Value',
  'Final CGST Tax',
  'Final SGST Tax',
  'Final IGST Tax'
];

XLSX.utils.sheet_add_aoa(gstrSheet, [columnOrder], { origin: "A1" });

// ==================================
// APPEND TO WORKBOOK
// ==================================

XLSX.utils.book_append_sheet(
  pivotWorkbook,              // your existing workbook
  gstrSheet,
  'amazon-b2c-gstr-hsn'       // sheet name
);
    // ================================
    // RETURN STRUCTURE EXPECTED BY CONTROLLER
    // ================================
    return {
      workbook,               // ExcelJS
      outputWorkbook: pivotWorkbook,  // XLSX
      process1Json: filteredRows,
      pivotData: pivotData
    };

  } catch (error) {
    console.error('processMacros Error:', error);
    throw error;
  }
}

module.exports = {
  processMacros
};