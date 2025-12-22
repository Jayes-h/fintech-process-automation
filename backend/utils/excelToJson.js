const XLSX = require('xlsx');

/**
 * Convert Excel file buffer to JSON
 * @param {Buffer} fileBuffer - Excel file buffer
 * @returns {Object} - Parsed Excel data
 */
function excelToJson(fileBuffer) {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }

    // Convert to array of arrays for raw data
    const aoa = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, 
      raw: true, 
      defval: '' 
    });

    // Convert to JSON with headers
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      raw: false,
      defval: null
    });

    return {
      sheetName,
      aoa, // Array of arrays
      jsonData, // JSON with headers
      worksheet // Original worksheet for further processing
    };
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
}

/**
 * Convert JSON data to Excel buffer
 * @param {Array} data - Array of objects
 * @param {String} sheetName - Name of the sheet
 * @returns {Buffer} - Excel file buffer
 */
function jsonToExcel(data, sheetName = 'Sheet1') {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  } catch (error) {
    throw new Error(`Failed to create Excel file: ${error.message}`);
  }
}

module.exports = {
  excelToJson,
  jsonToExcel
};









