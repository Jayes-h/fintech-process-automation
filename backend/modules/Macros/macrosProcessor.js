const ExcelJS = require('exceljs');
const XLSXJSSTYLE = require('xlsx-js-style');
const XLSX = require('xlsx');

// const XLSX = require('xlsx');

/**
 * Read ALL original headers from uploaded file (no ExcelJS mutation)
 */
function getOriginalHeadersFromXLSX(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];

  const range = XLSX.utils.decode_range(sheet['!ref']);
  const headers = [];

  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c })];
    headers.push(cell ? String(cell.v).trim() : '');
  }

  return headers;
}

function removeHeaders(ws, allHeaders, headersToRemove) {
  // iterate right → left to avoid index shifting
  for (let i = allHeaders.length - 1; i >= 0; i--) {
    if (headersToRemove.includes(allHeaders[i])) {
      ws.spliceColumns(i + 1, 1); // ExcelJS is 1-based
      allHeaders.splice(i, 1);
    }
  }
}


/**
 * Keep header array in sync with worksheet inserts
 */
function insertHeaderAfter(allHeaders, afterHeader, newHeaders) {
  if (!Array.isArray(newHeaders)) {
    throw new Error(`newHeaders must be an array. Got: ${typeof newHeaders}`);
  }

  const index = allHeaders.indexOf(afterHeader);
  if (index === -1) {
    throw new Error(`Header "${afterHeader}" not found in allHeaders`);
  }

  allHeaders.splice(index + 1, 0, ...newHeaders);
}


/**
 * Formula Evaluator - Evaluates Excel formulas to actual values
 * Handles: VLOOKUP, IF, arithmetic operations, cell references
 */
class FormulaEvaluator {
  constructor(worksheet, sourceSheet) {
    this.ws = worksheet;
    this.sourceSheet = sourceSheet;
    this.workbook = worksheet.workbook || null; // Access workbook if available
    this.cache = {}; // Cache for evaluated cells to handle dependencies
    this.missingSKUs = new Set(); // Track missing SKUs
  }

   
  
  /**
   * Get cell value by column letter and row number
   * @param {string} colLetter - Column letter (e.g., 'A', 'N', 'AA')
   * @param {number} rowNum - Row number
   * @returns {any} - Cell value
   */
  getCellValue(colLetter, rowNum) {
    const cell = this.ws.getCell(`${colLetter}${rowNum}`);
    
    // If cell has a formula, evaluate it
    if (cell.formula) {
      const cacheKey = `${colLetter}${rowNum}`;
      if (this.cache[cacheKey] !== undefined) {
        return this.cache[cacheKey];
      }
      const result = this.evaluateFormula(cell.formula, rowNum);
      this.cache[cacheKey] = result;
      return result;
    }
    
    // Return the cell value directly
    return cell.value !== null && cell.value !== undefined ? cell.value : 0;
  }

  /**
   * Evaluate a formula string
   * @param {string} formula - Formula string (e.g., "VLOOKUP(N2,Source!$A:$C,2,TRUE)")
   * @param {number} currentRow - Current row number for relative references
   * @returns {any} - Evaluated result
   */
  evaluateFormula(formula, currentRow) {
    if (!formula || typeof formula !== 'string') {
      return 0;
    }

    const formulaUpper = formula.trim().toUpperCase();

    // Handle VLOOKUP
    if (formulaUpper.startsWith('VLOOKUP(')) {
      return this.evaluateVLOOKUP(formula, currentRow);
    }

    // Handle IF
    if (formulaUpper.startsWith('IF(')) {
      return this.evaluateIF(formula, currentRow);
    }

    // Handle arithmetic operations (simple expressions like "A2+B2" or "A2-B2")
    if (formula.match(/^[A-Z]+\d+[\+\-\*\/][A-Z]+\d+/)) {
      return this.evaluateArithmetic(formula, currentRow);
    }

    // Handle complex arithmetic with multiple operations
    if (formula.match(/[A-Z]+\d+/)) {
      return this.evaluateComplexArithmetic(formula, currentRow);
    }

    // If we can't evaluate, return 0
    console.warn(`Could not evaluate formula: ${formula}`);
    return 0;
  }

  /**
   * Evaluate VLOOKUP formula
   * VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])
   * Example: VLOOKUP(N2,Source!$A:$C,2,TRUE)
   */
  evaluateVLOOKUP(formula, currentRow) {
    try {
      // Extract VLOOKUP parameters
      const match = formula.match(/VLOOKUP\(([^,]+),([^,]+),(\d+),([^)]+)\)/i);
      if (!match) {
        return 0;
      }

      const lookupValueExpr = match[1].trim();
      const tableRange = match[2].trim();
      const colIndex = parseInt(match[3], 10);
      const rangeLookup = match[4].trim().toUpperCase() === 'TRUE' || match[4].trim() === '1';

      // Evaluate lookup value (could be a cell reference like N2)
      let lookupValue = this.evaluateExpression(lookupValueExpr, currentRow);

      // Parse table range (e.g., "Source!$A:$C")
      const sourceMatch = tableRange.match(/([^!]+)!(\$?)([A-Z]+):(\$?)([A-Z]+)/i);
      if (!sourceMatch) {
        return 0;
      }

      const sheetName = sourceMatch[1].trim();
      const startCol = sourceMatch[3].toUpperCase();
      const endCol = sourceMatch[5].toUpperCase();

      // Get source sheet
      let sourceWs = this.sourceSheet;
      if (sheetName !== 'Source' && this.workbook) {
        sourceWs = this.workbook.getWorksheet(sheetName) || this.sourceSheet;
      }

      if (!sourceWs) {
        return 0;
      }

      // Search in source sheet
      let foundRow = null;
      const maxRow = Math.min(sourceWs.actualRowCount || 12000, 12000);
      console.log("sourceWs.rowCount==========================>",sourceWs.rowCount);
      console.log("maxRow==========================>",maxRow);
      for (let row = 1; row <= maxRow; row++) {
        const cell = sourceWs.getCell(`${startCol}${row}`);
        const cellValue = cell.value;
        
        if (cellValue !== null && cellValue !== undefined) {
          const cellStr = String(cellValue).trim();
          const lookupStr = String(lookupValue).trim();
          
          if (rangeLookup === false) {
            // Exact match
            if (cellStr === lookupStr) {
              foundRow = row;
              break;
            }
          } else {
            // Approximate match (not commonly used, but handle it)
            if (cellStr === lookupStr || parseFloat(cellStr) === parseFloat(lookupStr)) {
              foundRow = row;
              break;
            }
          }
        }
      }

      if (!foundRow) {
        // Check if this is a SKU lookup (Source!$A:$C with colIndex 2 means FG column)
        if (sheetName === 'Source' && startCol === 'A' && colIndex === 2 && lookupValue) {
          // This is a SKU lookup that failed - track the missing SKU
          const missingSKU = String(lookupValue).trim();
          if (missingSKU) {
            this.missingSKUs.add(missingSKU);
            console.warn(`⚠ WARNING: Missing SKU detected during formula evaluation: "${missingSKU}"`);
            // Return empty string instead of 0 to indicate missing value
            // This will prevent blank calculations
            return '';
          }
        }
        return 0; // VLOOKUP returns #N/A equivalent for other lookups
      }

      // Get column index (convert 1-based to column letter)
      const colLetter = this.getColumnLetterFromIndex(this.columnToIndex(startCol) + colIndex - 1);
      const resultCell = sourceWs.getCell(`${colLetter}${foundRow}`);
      
      return resultCell.value !== null && resultCell.value !== undefined ? resultCell.value : 0;
    } catch (error) {
      console.warn(`Error evaluating VLOOKUP: ${formula}`, error.message);
      return 0;
    }
  }

  /**
   * Evaluate IF formula
   * IF(condition, value_if_true, value_if_false)
   * Example: IF(V2=Z2,(AU2)*AT2,0)
   */
  evaluateIF(formula, currentRow) {
    try {
      // Extract IF parameters - handle nested parentheses correctly
      // Find the opening parenthesis after "IF"
      const openParen = formula.indexOf('(');
      if (openParen === -1) return 0;
      
      let depth = 0;
      let params = [];
      let currentParam = '';
      let inQuotes = false;
      
      // Start after "IF("
      for (let i = openParen + 1; i < formula.length; i++) {
        const char = formula[i];
        
        // Handle quotes (for string literals, though we don't use them)
        if (char === '"') {
          inQuotes = !inQuotes;
          currentParam += char;
          continue;
        }
        
        if (inQuotes) {
          currentParam += char;
          continue;
        }
        
        if (char === '(') {
          depth++;
          currentParam += char;
        } else if (char === ')') {
          if (depth === 0) {
            // This is the closing parenthesis of IF
            if (currentParam.trim()) {
              params.push(currentParam.trim());
            }
            break;
          } else {
            depth--;
            currentParam += char;
          }
        } else if (char === ',' && depth === 0) {
          // Comma at top level - parameter separator
          params.push(currentParam.trim());
          currentParam = '';
        } else {
          currentParam += char;
        }
      }

      if (params.length < 3) {
        return 0;
      }

      const condition = params[0];
      const valueIfTrue = params[1];
      const valueIfFalse = params[2];

      // Evaluate condition
      const conditionResult = this.evaluateCondition(condition, currentRow);

      // Return appropriate value
      if (conditionResult) {
        return this.evaluateExpression(valueIfTrue, currentRow);
      } else {
        return this.evaluateExpression(valueIfFalse, currentRow);
      }
    } catch (error) {
      console.warn(`Error evaluating IF: ${formula}`, error.message);
      return 0;
    }
  }

  /**
   * Evaluate condition (e.g., "V2=Z2" or "V2<>Z2")
   */
  evaluateCondition(condition, currentRow) {
    condition = condition.trim();
    
    // Handle equality
    if (condition.includes('=')) {
      const parts = condition.split('=');
      if (parts.length === 2) {
        const left = this.evaluateExpression(parts[0].trim(), currentRow);
        const right = this.evaluateExpression(parts[1].trim(), currentRow);
        return String(left).trim() === String(right).trim();
      }
    }
    
    // Handle not equal
    if (condition.includes('<>')) {
      const parts = condition.split('<>');
      if (parts.length === 2) {
        const left = this.evaluateExpression(parts[0].trim(), currentRow);
        const right = this.evaluateExpression(parts[1].trim(), currentRow);
        return String(left).trim() !== String(right).trim();
      }
    }

    return false;
  }

  /**
   * Evaluate arithmetic expression (e.g., "A2+B2", "A2-B2", "(A2)*B2")
   */
  evaluateArithmetic(formula, currentRow) {
    return this.evaluateComplexArithmetic(formula, currentRow);
  }

  /**
   * Evaluate complex arithmetic with multiple operations
   * Uses a safe tokenized approach to avoid JavaScript operator interpretation issues
   */
  evaluateComplexArithmetic(formula, currentRow) {
    try {
      // Replace cell references with their values
      let expression = formula;
      const cellRefRegex = /([A-Z]+)(\d+)/g;
      let match;
      
      while ((match = cellRefRegex.exec(formula)) !== null) {
        const colLetter = match[1];
        const rowNum = parseInt(match[2], 10);
        const cellValue = this.getCellValue(colLetter, rowNum);
        const numericValue = Number(cellValue) || 0;
        expression = expression.replace(match[0], numericValue);
      }

      // Remove any remaining non-numeric, non-operator characters
      expression = expression.replace(/[^0-9+\-*/().\s]/g, '').trim();
      
      // Use a safe tokenized evaluation approach
      // This avoids issues with JavaScript interpreting -- as decrement operator
      return this.safeEvaluateExpression(expression);
    } catch (error) {
      console.warn(`Error in complex arithmetic: ${formula}`, error.message);
      return 0;
    }
  }

  /**
   * Safely evaluate a mathematical expression using tokenization
   * Handles: +, -, *, /, parentheses, and negative numbers
   */
  safeEvaluateExpression(expr) {
    try {
      // Tokenize the expression
      const tokens = [];
      let currentNum = '';
      let i = 0;
      
      while (i < expr.length) {
        const char = expr[i];
        
        if (char === ' ') {
          if (currentNum) {
            tokens.push(parseFloat(currentNum));
            currentNum = '';
          }
          i++;
          continue;
        }
        
        if ((char >= '0' && char <= '9') || char === '.') {
          currentNum += char;
          i++;
          continue;
        }
        
        if (char === '-') {
          // Check if this is a negative sign (unary minus) or subtraction operator
          // It's unary if: at start, after operator, or after open paren
          const lastToken = tokens[tokens.length - 1];
          const isUnary = tokens.length === 0 || 
                          lastToken === '+' || lastToken === '-' || 
                          lastToken === '*' || lastToken === '/' || 
                          lastToken === '(';
          
          if (currentNum) {
            tokens.push(parseFloat(currentNum));
            currentNum = '';
          }
          
          if (isUnary) {
            // Start of a negative number
            currentNum = '-';
          } else {
            // Subtraction operator
            tokens.push('-');
          }
          i++;
          continue;
        }
        
        if (char === '+' || char === '*' || char === '/' || char === '(' || char === ')') {
          if (currentNum) {
            tokens.push(parseFloat(currentNum));
            currentNum = '';
          }
          tokens.push(char);
          i++;
          continue;
        }
        
        i++;
      }
      
      if (currentNum) {
        tokens.push(parseFloat(currentNum));
      }
      
      // Evaluate the tokenized expression using recursive descent parser
      return this.evaluateTokens(tokens);
    } catch (e) {
      console.warn(`Error in safe expression evaluation: ${expr}`, e.message);
      return 0;
    }
  }

  /**
   * Evaluate tokenized expression respecting operator precedence
   */
  evaluateTokens(tokens) {
    let pos = 0;
    
    const parseExpression = () => {
      let left = parseTerm();
      
      while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
        const op = tokens[pos++];
        const right = parseTerm();
        if (op === '+') {
          left = left + right;
        } else {
          left = left - right;
        }
      }
      
      return left;
    };
    
    const parseTerm = () => {
      let left = parseFactor();
      
      while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/')) {
        const op = tokens[pos++];
        const right = parseFactor();
        if (op === '*') {
          left = left * right;
        } else {
          left = right !== 0 ? left / right : 0;
        }
      }
      
      return left;
    };
    
    const parseFactor = () => {
      if (tokens[pos] === '(') {
        pos++; // skip '('
        const result = parseExpression();
        pos++; // skip ')'
        return result;
      }
      
      const value = tokens[pos++];
      return typeof value === 'number' ? value : 0;
    };
    
    return parseExpression();
  }

  /**
   * Evaluate a general expression (could be cell reference, number, or formula)
   */
  evaluateExpression(expr, currentRow) {
    expr = expr.trim();
    
    // If it's a number
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
      return parseFloat(expr);
    }
    
    // If it's a cell reference (e.g., "N2", "A2")
    const cellRefMatch = expr.match(/^([A-Z]+)(\d+)$/i);
    if (cellRefMatch) {
      const colLetter = cellRefMatch[1].toUpperCase();
      const rowNum = parseInt(cellRefMatch[2], 10);
      return this.getCellValue(colLetter, rowNum);
    }
    
    // If it contains cell references or arithmetic, evaluate as arithmetic
    if (expr.match(/[A-Z]+\d+/) || expr.match(/[\+\-\*\/\(\)]/)) {
      return this.evaluateComplexArithmetic(expr, currentRow);
    }
    
    // If it's a formula function, evaluate it
    if (expr.startsWith('=') || expr.match(/^[A-Z]+\(/)) {
      return this.evaluateFormula(expr.replace(/^=/, ''), currentRow);
    }
    
    return 0;
  }

  /**
   * Convert column letter to index (A=0, B=1, ..., Z=25, AA=26, etc.)
   */
  columnToIndex(colLetter) {
    let index = 0;
    for (let i = 0; i < colLetter.length; i++) {
      index = index * 26 + (colLetter.charCodeAt(i) - 64);
    }
    return index - 1;
  }

  /**
   * Convert column index to letter (0=A, 1=B, ..., 25=Z, 26=AA, etc.)
   */
  getColumnLetterFromIndex(index) {
    let result = '';
    index++;
    while (index > 0) {
      index--;
      result = String.fromCharCode(65 + (index % 26)) + result;
      index = Math.floor(index / 26);
    }
    return result;
  }

  /**
   * Evaluate all formulas in a row and return calculated values
   * @param {number} rowNum - Row number to evaluate
   * @returns {Object} - Object with column names and calculated values
   */
  evaluateRow(rowNum, columnMap) {
    const rowData = {};
    const row = this.ws.getRow(rowNum);
    
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const headerName = columnMap[colNumber];
      if (headerName) {
        if (cell.formula) {
          // Evaluate formula
          rowData[headerName] = this.getCellValue(this.getColumnLetterFromIndex(colNumber - 1), rowNum);
        } else {
          // Use direct value
          rowData[headerName] = cell.value !== null && cell.value !== undefined ? cell.value : '';
        }
      }
    });
    
    return rowData;
  }
}

/**
 * Find column index by header name
 */
function findColumnIndex(ws, headerName) {
  const headerRow = ws.getRow(1);
  
  for (let i = 1; i <= headerRow.cellCount; i++) {
    const cellValue = headerRow.getCell(i).value;
    if (cellValue && String(cellValue).trim() === headerName) {
      return i;
    }
   
  }
  throw new Error(`Header '${headerName}' not found`);
}

/**
 * STEP 0: Filter rows by Transaction Type
 * Only keep rows where Transaction Type = "Shipment" or "Refund"
 * This MUST happen BEFORE any column insertion or formula application
 * 
 * OPTIMIZED: Uses in-memory filtering instead of spliceRows for performance
 * The old approach called spliceRows for each deleted row, which is O(n²) and very slow
 * New approach: Read all rows to keep, then rebuild worksheet once - O(n)
 */
function filterRowsByTransactionType(ws) {
  console.log('=== STEP 0: Filtering rows by Transaction Type ===');
  
  // Step 1: Find "Transaction Type" and "Quantity" columns dynamically (no hardcoded column letters)
  const headerRow = ws.getRow(1);
  let transactionTypeColIndex = null;
  let quantityColIndex = null;
  const maxColCount = headerRow.cellCount || 200;
  
  for (let i = 1; i <= maxColCount; i++) {
    const cellValue = headerRow.getCell(i).value;
    if (cellValue) {
      const cellStr = String(cellValue).trim();
      // Case-insensitive match for "Transaction Type"
      if (cellStr.toLowerCase() === 'transaction type') {
        transactionTypeColIndex = i;
      }
      // Case-insensitive match for "Quantity"
      if (cellStr.toLowerCase() === 'quantity') {
        quantityColIndex = i;
      }
    }
  }
  
  if (!transactionTypeColIndex) {
    throw new Error('"Transaction Type" column not found in the raw file. Please ensure the column exists.');
  }
  
  console.log(`Found "Transaction Type" column at index ${transactionTypeColIndex}`);
  
  if (quantityColIndex) {
    console.log(`Found "Quantity" column at index ${quantityColIndex}`);
  } else {
    console.warn('Warning: "Quantity" column not found. Refund quantity adjustment will be skipped.');
  }
  
  // Get total row count
  const totalRows = ws.actualRowCount || 1;
  console.log(`Total rows before filtering: ${totalRows}`);
  
  // Track statistics
  let keptRows = 0;
  let deletedRows = 0;
  let refundQuantityAdjusted = 0;
  const seenValues = {}; // Track what values we see for debugging
  
  // Step 2: OPTIMIZED - Collect rows to keep in memory first (instead of deleting one by one)
  // This is much faster than spliceRows which rebuilds the worksheet on each call
  const rowsToKeep = [];
  
  console.log('Scanning rows to filter...');
  console.log("total rows",totalRows);
  for (let rowNum = 2; rowNum <= totalRows; rowNum++) {
    // Progress logging every 1000 rows
    if (rowNum % 1000 === 0) {
      console.log(`Filtering progress: ${rowNum}/${totalRows} rows scanned...`);
    }
    
    const row = ws.getRow(rowNum);
    
    // Skip empty rows
    if (!row || row.cellCount === 0) {
      deletedRows++;
      continue;
    }
    
    const transactionTypeCell = row.getCell(transactionTypeColIndex);
    const transactionTypeValue = transactionTypeCell.value;
    
    // Convert to string, trim, and normalize (case-insensitive)
    const transactionTypeStr = transactionTypeValue ? String(transactionTypeValue).trim() : '';
    const transactionTypeNormalized = transactionTypeStr.toLowerCase();
    
    // Track seen values for debugging
    if (transactionTypeStr) {
      seenValues[transactionTypeStr] = (seenValues[transactionTypeStr] || 0) + 1;
    }
    
    // Only keep rows where Transaction Type is "Shipment" or "Refund" (case-insensitive)
    if (transactionTypeNormalized === 'shipment' || transactionTypeNormalized === 'refund') {
      // Collect all cell values from this row
      const rowData = [];
      for (let col = 1; col <= maxColCount; col++) {
        const cell = row.getCell(col);
        let cellValue = cell.value;
        
        // If Transaction Type is "Refund", make Quantity negative
        if (col === quantityColIndex && transactionTypeNormalized === 'refund') {
          if (cellValue !== null && cellValue !== undefined) {
            const numericQuantity = parseFloat(cellValue);
            if (!isNaN(numericQuantity) && numericQuantity > 0) {
              cellValue = -Math.abs(numericQuantity);
              refundQuantityAdjusted++;
            }
          }
        }
        
        rowData.push(cellValue);
      }
      rowsToKeep.push(rowData);
      keptRows++;
    } else {
      deletedRows++;
    }
  }
  
  console.log(`Scan complete. Rebuilding worksheet with ${keptRows} filtered rows...`);
  
  // Step 3: Rebuild the worksheet with only the rows to keep
  // First, clear all existing data rows (keep header row 1)
  // Use spliceRows once to remove all data rows at once
  if (totalRows > 1) {
    ws.spliceRows(2, totalRows - 1);
  }
  
  // Now add back only the rows we want to keep
  for (let i = 0; i < rowsToKeep.length; i++) {
    const newRowNum = i + 2; // Start from row 2 (after header)
    const newRow = ws.getRow(newRowNum);
    const rowData = rowsToKeep[i];
    
    for (let col = 1; col <= rowData.length; col++) {
      if (rowData[col - 1] !== null && rowData[col - 1] !== undefined) {
        newRow.getCell(col).value = rowData[col - 1];
      }
    }
    newRow.commit();
    
    // Progress logging every 1000 rows
    if ((i + 1) % 1000 === 0) {
      console.log(`Rebuild progress: ${i + 1}/${keptRows} rows written...`);
    }
  }
  
  // Log what values were found
  console.log('Transaction Type values found in file:', Object.keys(seenValues));
  console.log(`Filtered results: Kept ${keptRows} rows (Shipment/Refund), Deleted ${deletedRows} rows`);
  console.log(`Refund rows with Quantity made negative: ${refundQuantityAdjusted}`);
  
  if (keptRows === 0) {
    throw new Error('No rows found with Transaction Type "Shipment" or "Refund". Please check your raw file.');
  }
  
  // Verify the filtering worked
  const remainingRows = ws.actualRowCount || 1;
  console.log(`Total rows after filtering: ${remainingRows} (should be ${keptRows + 1} including header)`);
  
  console.log('✓ Transaction Type filtering completed successfully');

  ws._rows.length = keptRows + 1;
ws._rowCount = keptRows + 1;

console.log(
  `Hard reset worksheet rows. actualRowCount=${ws.actualRowCount}`
);
  return keptRows;
}

/**
 * Get column letter from index (1 = A, 2 = B, etc.)
 */
function getColumnLetter(colIndex) {
  let result = '';
  let num = colIndex;
  while (num > 0) {
    num--;
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26);
  }
  return result;
}

/**
 * STEP 1: Insert Columns & Rename Headers
 * Using manual cell shifting approach for reliable column insertion
 * Insert columns in reverse order (right to left) to avoid index shifting
 * @param {Workbook} workbook - ExcelJS workbook
 * @param {string} sheetName - Name of the sheet to modify
 * @param {boolean} withInventory - If false, skip FG, Ship To State Tally Ledger, Final Invoice No. columns
 */
function insertColumnsAndRenameHeaders(workbook, sheetName, withInventory = true, allHeaders) {

  const afterHeader = 'Ship To City';
  const idx = allHeaders.indexOf(afterHeader);
  // if (idx === -1) throw new Error(`Header ${afterHeader} not found`);
  // allHeaders.splice(idx + 1, 0, ...newHeaders);

  
  const ws = workbook.getWorksheet(sheetName);
  if (!ws) {
    throw new Error(`Sheet '${sheetName}' not found`);
  }

  // Get actual row and column counts (don't process more than necessary)
  const maxRow = ws.actualRowCount || 1;
  const maxCol = ws.columnCount || 200;

  /**
   * Helper function to manually insert a column by shifting cells
   * This is more reliable than spliceColumns for ensuring proper column separation
   */
  const insertColumnAt = (colIndex, headerName) => {
    // Shift all cells from colIndex onwards to the right
    // Process from rightmost column backwards to avoid overwriting
    for (let row = 1; row <= maxRow; row++) {
      const currentRow = ws.getRow(row);
      
      // Shift cells from right to left (backwards) to avoid overwriting
      for (let col = maxCol; col >= colIndex; col--) {
        const sourceCell = currentRow.getCell(col);
        const targetCell = currentRow.getCell(col + 1);
        
        // Check if source cell has any content (value, formula, or style)
        const hasValue = sourceCell.value !== null && sourceCell.value !== undefined;
        const hasFormula = sourceCell.formula !== null && sourceCell.formula !== undefined;
        
        if (hasValue || hasFormula) {
          // Copy cell value
          if (hasValue) {
            targetCell.value = sourceCell.value;
          }
          // Copy formula if exists
          if (hasFormula) {
            targetCell.formula = sourceCell.formula;
          }
          // Copy style if exists (try-catch to handle style copying issues)
          try {
            if (sourceCell.style && Object.keys(sourceCell.style).length > 0) {
              // Copy style properties individually to avoid deep cloning issues
              const style = sourceCell.style;
              if (style.font) targetCell.font = JSON.parse(JSON.stringify(style.font));
              if (style.fill) targetCell.fill = JSON.parse(JSON.stringify(style.fill));
              if (style.border) targetCell.border = JSON.parse(JSON.stringify(style.border));
              if (style.alignment) targetCell.alignment = JSON.parse(JSON.stringify(style.alignment));
            }
          } catch (styleError) {
            // Ignore style copying errors
          }
        }
      }
    }
    
    // Set the header in row 1, column colIndex
    ws.getRow(1).getCell(colIndex).value = headerName;
    console.log(`Inserted column "${headerName}" at position ${colIndex}`);
  };

  // Insert columns in REVERSE ORDER (right to left) to avoid index shifting
  // This ensures that previously found column indices remain valid


  // 2. Insert 9 columns after "Compensatory Cess Tax"
  // Insert them one at a time in reverse order to maintain positions
    try {

           // 🔥 REMOVE UNWANTED HEADERS FIRST
          const headersToRemove = [
            'Shipping Cess Tax Amount',
            'Gift Wrap Amount',
            'Gift Wrap Utgst Tax',
            'Gift Wrap Igst Tax',
            'Gift Wrap Cgst Tax',
            'Gift Wrap Sgst Tax',
            'Gift Wrap Promo Discount',
            'Gift Wrap Promo Discount Basis'
          ];

      removeHeaders(ws, allHeaders, headersToRemove);
      
      const cessCol = findColumnIndex(ws, 'Compensatory Cess Tax');
    
      const newHeaders = [
        'Final Tax rate',
        'Final Taxable Sales Value',
        'Final Taxable Shipping Value',
        'Final CGST Tax',
        'Final SGST Tax',
        'Final IGST Tax',
        'Final Shipping CGST Tax',
        'Final Shipping SGST Tax',
        'Final Shipping IGST Tax',
        'Final Amount Receivable',
      ];
    
      // ✅ Keep header array in sync
      insertHeaderAfter(allHeaders, 'Compensatory Cess Tax', newHeaders);
    
      // ✅ Insert into worksheet (right → left)
      for (let i = newHeaders.length - 1; i >= 0; i--) {
        insertColumnAt(cessCol + 1, newHeaders[i]);
      }
    
      console.log(`Inserted ${newHeaders.length} columns after "Compensatory Cess Tax"`);
    } catch (e) {
      console.warn('Could not insert columns after Compensatory Cess Tax:', e.message);
    }
    

  // 3. Insert 2 columns after "Ship To State" (only if withInventory is true)
  
    try {
      const shipToStateCol = findColumnIndex(ws, 'Ship To State');
  
      // ✅ Update header list FIRST
      insertHeaderAfter(allHeaders, 'Ship To State', [
        'Ship To State Tally Ledger',
        'Final Invoice No.',
      ]);
  
      // ✅ Insert into worksheet (reverse order)
      insertColumnAt(shipToStateCol + 1, 'Final Invoice No.');
      insertColumnAt(shipToStateCol + 1, 'Ship To State Tally Ledger');
  
      console.log(`Inserted 2 columns after "Ship To State"`);
    } catch (e) {
      console.warn('Could not insert columns after Ship To State:', e.message);
    }
  

  // 4. Insert column after "Sku" last (leftmost) (only if withInventory is true)
  if (withInventory) {
    try {
      const skuCol = findColumnIndex(ws, 'Sku');
  
      // ✅ Sync header array
      insertHeaderAfter(allHeaders, 'Sku', ['FG']);
  
      // ✅ Insert worksheet column
      insertColumnAt(skuCol + 1, 'FG');
  
      console.log(`Inserted column "FG" after "Sku"`);
    } catch (e) {
      console.warn('Could not insert column after Sku:', e.message);
    }
  } else {
    console.log('Skipping FG column (withInventory=false)');
  }

  return ws;
}


/**
 * STEP 2: Apply Formulas to Ranges
 * Formulas reference columns by their header names for reliability
 * @param {Worksheet} ws - ExcelJS worksheet
 * @param {string} sourceSheetName - Name of the source sheet
 * @param {boolean} withInventory - If false, skip FG, Ship To State Tally Ledger, Final Invoice No. formulas
 */
function applyFormulas(ws, sourceSheetName = 'Source', withInventory = true) {
  const lastRow = Math.min(ws.actualRowCount || 50000, 50000);

  // Helper to safely find column and get letter
  const getColLetter = (headerName) => {
    try {
      const colIndex = findColumnIndex(ws, headerName);
      return getColumnLetter(colIndex);
    } catch (e) {
      return null;
    }
  };

  // Find all required columns once
  const colSku = getColLetter('Sku');
  const colFG = getColLetter('FG');
  const colShipToState = getColLetter('Ship To State');
  const colShipToStateTally = getColLetter('Ship To State Tally Ledger');
  const colFinalInvoiceNo = getColLetter('Final Invoice No.');
  const colCgstRate = getColLetter('Cgst Rate');
  const colSgstRate = getColLetter('Sgst Rate');
  const colIgstRate = getColLetter('Igst Rate');
  const colFinalTaxRate = getColLetter('Final Tax rate');
  const colFinalTaxableSalesValue = getColLetter('Final Taxable Sales Value');
  const colFinalTaxableShippingValue = getColLetter('Final Taxable Shipping Value');
  const colFinalCGSTTax = getColLetter('Final CGST Tax');
  const colFinalSGSTTax = getColLetter('Final SGST Tax');
  const colFinalIGSTTax = getColLetter('Final IGST Tax');
  const colFinalShippingCGSTTax = getColLetter('Final Shipping CGST Tax');
  const colFinalShippingSGSTTax = getColLetter('Final Shipping SGST Tax');
  const colFinalShippingIGSTTax = getColLetter('Final Shipping IGST Tax');
  const colTcsCgstAmount = getColLetter('Tcs Cgst Amount');
  const colTcsSgstAmount = getColLetter('Tcs Sgst Amount');
  const colTcsIgstAmount = getColLetter('Tcs Igst Amount');
  const colFinalAmountReceivable = getColLetter('Final Amount Receivable');
  const colPrincipalAmount = getColLetter('Principal Amount');
  const colShippingAmountBasis = getColLetter('Shipping Amount Basis');
  const colGiftWrapAmountBasis = getColLetter('Gift Wrap Amount Basis');
  const colGiftWrapPromoAmountBasis = getColLetter('Gift Wrap Promo Amount Basis');
  const colShipFromState = getColLetter('Ship From State');
  const colTaxExclusiveGross = getColLetter('Tax Exclusive Gross');

  console.log("col tcsCgstAmount", colTcsCgstAmount);
  console.log("col tcsSgstAmount", colTcsSgstAmount);
  console.log("col tcsIgstAmount", colTcsIgstAmount);

  for (let row = 2; row <= lastRow; row++) {
    try {
      // Column FG (O): =VLOOKUP(Sku,'source-sku'!$A$2:$B$229,2,TRUE)
      // Only apply if withInventory is true
      if (withInventory && colSku && colFG) {
        ws.getCell(`${colFG}${row}`).value = {
          formula: `VLOOKUP(${colSku}${row},'source-sku'!$A$2:$B$229,2,FALSE)`
        };
      }

      // Column Ship To State Tally Ledger (AA): =VLOOKUP(Ship To State,'source-state'!$A$2:$C$37,3,0)
      // Only apply if withInventory is true
      if (colShipToState && colShipToStateTally) {
        ws.getCell(`${colShipToStateTally}${row}`).value = {
          formula: `VLOOKUP(${colShipToState}${row},'source-state'!$A$2:$C$37,3,0)`
        };
      }

      // Column Final Invoice No. (AB): =VLOOKUP(Ship To State,'source-state'!$A$2:$C$37,2,TRUE)
      // Only apply if withInventory is true
      if (colShipToState && colFinalInvoiceNo) {
        ws.getCell(`${colFinalInvoiceNo}${row}`).value = {
          formula: `VLOOKUP(${colShipToState}${row},'source-state'!$A$2:$C$37,2,TRUE)`
        };
      }

      // Column Final Tax rate (AT): =Cgst Rate + Sgst Rate (or use Igst Rate if applicable)
      // Based on VBA: =AH2+AK2, where AH is likely Cgst Rate and AK is Igst Rate
      if (colFinalTaxRate && colCgstRate && colIgstRate) {
        ws.getCell(`${colFinalTaxRate}${row}`).value = {
          formula: `${colCgstRate}${row}+${colIgstRate}${row}`
        };
      }

      // Column Final Taxable Shipping Value (AV): =Shipping Amount + Gift Wrap Amount + Item Promo Discount + Shipping Promo Discount
      // Based on VBA: =BD+BK+BU+BX
      // Calculate this FIRST before Final Taxable Sales Value (which depends on it)
      if (colFinalTaxableShippingValue) {
        const parts = [];
        if (colShippingAmountBasis) parts.push(`${colShippingAmountBasis}${row}`);
        if (colGiftWrapAmountBasis) parts.push(`${colGiftWrapAmountBasis}${row}`);
        if (colGiftWrapPromoAmountBasis) parts.push(`${colGiftWrapPromoAmountBasis}${row}`);
        // Try to find Shipping Promo Discount
        try {
          const colShippingPromoDiscount = getColLetter('Shipping Promo Discount Basis');
          if (colShippingPromoDiscount) parts.push(`${colShippingPromoDiscount}${row}`);
        } catch (e) {}
        
        if (parts.length > 0) {
          ws.getCell(`${colFinalTaxableShippingValue}${row}`).value = {
            formula: parts.join('+')
          };
        }
      }

      // Column Final Taxable Sales Value (AU): =Tax Exclusive Gross - Final Taxable Shipping Value
      // This depends on Final Taxable Shipping Value, so calculate it after
      if (colFinalTaxableSalesValue && colTaxExclusiveGross && colFinalTaxableShippingValue) {
        ws.getCell(`${colFinalTaxableSalesValue}${row}`).value = {
          formula: `${colTaxExclusiveGross}${row}-${colFinalTaxableShippingValue}${row}`
        };
      }

      // Column Final CGST Tax (AW): =IF(Ship From State = Ship To State, (Final Taxable Sales Value) * Final Tax rate, 0)
      // Based on VBA: =IF(V2=Z2,(AU2)*AT2,0)
      if (colFinalCGSTTax && colShipFromState && colShipToState && colFinalTaxableSalesValue && colFinalTaxRate) {
        ws.getCell(`${colFinalCGSTTax}${row}`).value = {
          formula: `IF(${colShipFromState}${row}=${colShipToState}${row},(${colFinalTaxableSalesValue}${row})*${colFinalTaxRate}${row},0)`
        };
      }

      // Column Final SGST Tax (AX): same as Final CGST Tax
      if (colFinalSGSTTax && colShipFromState && colShipToState && colFinalTaxableSalesValue && colFinalTaxRate) {
        ws.getCell(`${colFinalSGSTTax}${row}`).value = {
          formula: `IF(${colShipFromState}${row}=${colShipToState}${row},(${colFinalTaxableSalesValue}${row})*${colFinalTaxRate}${row},0)`
        };
      }

      // Column Final IGST Tax (AY): =IF(Ship From State <> Ship To State, (Final Taxable Sales Value) * Final Tax rate, 0)
      // Based on VBA: =IF(V2<>Z2,(AU2)*AT2,0)
      if (colFinalIGSTTax && colShipFromState && colShipToState && colFinalTaxableSalesValue && colFinalTaxRate) {
        ws.getCell(`${colFinalIGSTTax}${row}`).value = {
          formula: `IF(${colShipFromState}${row}<>${colShipToState}${row},(${colFinalTaxableSalesValue}${row})*${colFinalTaxRate}${row},0)`
        };
      }

      // Column Final Shipping CGST Tax (AZ): =IF(Ship From State = Ship To State, (Final Taxable Shipping Value) * Final Tax rate, 0)
      // Based on VBA: =IF(V2=Z2,(AV2)*AT2,0)
      if (colFinalShippingCGSTTax && colShipFromState && colShipToState && colFinalTaxableShippingValue && colFinalTaxRate) {
        ws.getCell(`${colFinalShippingCGSTTax}${row}`).value = {
          formula: `IF(${colShipFromState}${row}=${colShipToState}${row},(${colFinalTaxableShippingValue}${row})*${colFinalTaxRate}${row},0)`
        };
      }

      // Column Final Shipping SGST Tax (BA): same as Final Shipping CGST Tax
      if (colFinalShippingSGSTTax && colShipFromState && colShipToState && colFinalTaxableShippingValue && colFinalTaxRate) {
        ws.getCell(`${colFinalShippingSGSTTax}${row}`).value = {
          formula: `IF(${colShipFromState}${row}=${colShipToState}${row},(${colFinalTaxableShippingValue}${row})*${colFinalTaxRate}${row},0)`
        };
      }

      // Column Final Shipping IGST Tax (BB): =IF(Ship From State <> Ship To State, (Final Taxable Shipping Value) * Final Tax rate, 0)
      // Based on VBA: same as AY but for shipping
      if (colFinalShippingIGSTTax && colShipFromState && colShipToState && colFinalTaxableShippingValue && colFinalTaxRate) {
        ws.getCell(`${colFinalShippingIGSTTax}${row}`).value = {
          formula: `IF(${colShipFromState}${row}<>${colShipToState}${row},(${colFinalTaxableShippingValue}${row})*${colFinalTaxRate}${row},0)`
        };
      }

      // Column Final Amount Receivable (CH): 
      // Formula: AU+AV+AW+AX+AY+AZ+BA+BB-CA-CC-CG
      // Where:
      // AU = Final Taxable Sales Value
      // AV = Final Taxable Shipping Value
      // AW = Final CGST Tax
      // AX = Final SGST Tax
      // AY = Final IGST Tax
      // AZ = Final Shipping CGST Tax
      // BA = Final Shipping SGST Tax
      // BB = Final Shipping IGST Tax
      // CA = Item Promo Amount (to subtract)
      // CC = Shipping Promo Amount (to subtract)
      // CG = Tcs Igst Amount (to subtract)
      // Based on VBA: =AU2+AV2+AW2+AX2+AY2+AZ2+BA2+BB2-CA2-CC2-CG2
      if (colFinalAmountReceivable) {
        const parts = [];
        // Add all positive components
        if (colFinalTaxableSalesValue) parts.push(`${colFinalTaxableSalesValue}${row}`); // AU
        if (colFinalTaxableShippingValue) parts.push(`${colFinalTaxableShippingValue}${row}`); // AV
        if (colFinalCGSTTax) parts.push(`${colFinalCGSTTax}${row}`); // AW
        if (colFinalSGSTTax) parts.push(`${colFinalSGSTTax}${row}`); // AX
        if (colFinalIGSTTax) parts.push(`${colFinalIGSTTax}${row}`); // AY
        if (colFinalShippingCGSTTax) parts.push(`${colFinalShippingCGSTTax}${row}`); // AZ
        if (colFinalShippingSGSTTax) parts.push(`${colFinalShippingSGSTTax}${row}`); // BA
        if (colFinalShippingIGSTTax) parts.push(`${colFinalShippingIGSTTax}${row}`); // BB


                
        // Find columns to subtract (CA, CC, CG)
        const subtractParts = [];
        
        if (colTcsIgstAmount) subtractParts.push(`${colTcsIgstAmount}${row}`); // CG
        if (colTcsCgstAmount) subtractParts.push(`${colTcsCgstAmount}${row}`); // BB
        if (colTcsSgstAmount) subtractParts.push(`${colTcsSgstAmount}${row}`); // BB

        
        // try {
        //   const colItemPromoAmount = getColLetter('Item Promo Amount'); // CA
        //   if (colItemPromoAmount) subtractParts.push(`${colItemPromoAmount}${row}`);
        // } catch (e) {}
        
        // try {
        //   const colShippingPromoAmount = getColLetter('Shipping Promo Amount'); // CC
        //   if (colShippingPromoAmount) subtractParts.push(`${colShippingPromoAmount}${row}`);
        // } catch (e) {}
        
        // CG = Tcs Igst Amount
        // if (colTcsIgstAmount) subtractParts.push(`${colTcsIgstAmount}${row}`); // CG
        
        if (parts.length > 0) {
          const formula = parts.join('+') + (subtractParts.length > 0 ? '-' + subtractParts.join('-') : '');
          ws.getCell(`${colFinalAmountReceivable}${row}`).value = { formula };
        }
      }
    } catch (e) {
      // Continue processing other rows even if one fails
      console.warn(`Error processing row ${row}:`, e.message);
    }
  }
}

/**
 * Build lookup map from Source sheet: states -> invoice number
 * @param {Worksheet} sourceSheet - ExcelJS worksheet for Source sheet
 * @returns {Object} - Map of state name to invoice number
 */
function buildStateToInvoiceMap(sourceSheet) {
  const stateInvoiceMap = {};
  
  if (!sourceSheet) {
    console.warn('Source sheet not provided, cannot build state to invoice map');
    return stateInvoiceMap;
  }

  try {
    // Find "states" column and invoice number column in Source sheet
    const headerRow = sourceSheet.getRow(1);
    let statesColIndex = null;
    let invoiceColIndex = null;
    
    // Search for "states" column (case-insensitive)
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const headerName = String(cell.value || '').trim().toLowerCase();
      if (headerName === 'states' || headerName === 'state') {
        statesColIndex = colNumber;
      }
      // Also look for invoice number column (could be "invoice", "invoice number", "final invoice no", etc.)
      if (headerName.includes('invoice') && !invoiceColIndex) {
        invoiceColIndex = colNumber;
      }
    });

    // If we found both columns, build the map
    if (statesColIndex && invoiceColIndex) {
      const maxRow = Math.min(sourceSheet.actualRowCount || 100, 100);
      const statesColLetter = getColumnLetter(statesColIndex);
      const invoiceColLetter = getColumnLetter(invoiceColIndex);
      
      for (let row = 2; row <= maxRow; row++) {
        const stateCell = sourceSheet.getCell(`${statesColLetter}${row}`);
        const invoiceCell = sourceSheet.getCell(`${invoiceColLetter}${row}`);
        
        if (stateCell.value !== null && stateCell.value !== undefined) {
          const stateName = String(stateCell.value).trim();
          const invoiceNumber = invoiceCell.value !== null && invoiceCell.value !== undefined 
            ? String(invoiceCell.value).trim() 
            : '';
          
          if (stateName) {
            stateInvoiceMap[stateName] = invoiceNumber;
          }
        }
      }
    } else {
      console.warn(`Could not find states column (found: ${statesColIndex}) or invoice column (found: ${invoiceColIndex}) in Source sheet`);
    }
  } catch (error) {
    console.warn('Error building state to invoice map:', error.message);
  }

  return stateInvoiceMap;
}

/**
 * STEP 3: Generate Pivot Table (JS Version)
 * 
 * CRITICAL FIXES from previous implementation:
 * 1. Key collision: Simple string join with '|' can collide if values contain '|' or empty strings differ.
 *    FIX: Use JSON.stringify of object key for stable, collision-free keys.
 * 
 * 2. Formula evaluation: Previous code pivoted on formula strings, not calculated values.
 *    FIX: Assumes process1Data contains fully evaluated numeric values (formulas already calculated).
 *    Excel PivotTable operates on calculated cell values, not formula text.
 * 
 * 3. NaN propagation: parseFloat() returns NaN for non-numeric strings, causing NaN + number = NaN.
 *    FIX: Use safe numeric conversion: Number(value) || 0, which handles NaN correctly.
 * 
 * 4. Filter handling: VBA shows Transacti on Type and Final Tax rate as PageFields (filters),
 *    but they don't affect aggregation unless explicitly applied. Current code correctly doesn't filter.
 * 
 * 5. Excel PivotTable behavior: Groups by 4 fields in exact order, sums all data fields.
 *    Matches VBA: RowFields = [Seller Gstin, Final Invoice No., Ship To State Tally Ledger, FG]
 *                 DataFields = [Quantity, Final Taxable Sales Value, ...] all with Function = xlSum
 * 
 * 6. Final Invoice No. calculation: For each Seller Gstin, find the Ship To State value,
 *    then look up the invoice number from Source sheet based on that state.
 * 
 * @param {Array} process1Data - Array of row objects from Process 1
 * @param {Worksheet} sourceSheet - ExcelJS worksheet for Source sheet (optional)
 * @param {boolean} withInventory - If false, group only by Seller Gstin (no FG, Invoice, Ledger)
 */
function generatePivot(process1Data, sourceSheet = null, withInventory = true, stateConfigData) {

 
  const pivot = {};

  // ---------- SAFE NUMBER ----------
  const safeNumber = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'string') {
      const cleaned = value.replace(/,/g, '').trim();
      const num = Number(cleaned);
      return isNaN(num) ? 0 : num;
    }
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // ---------- NORMALIZE STRING ----------
  const normalizeString = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  };

  // ---------- EXCEL-CORRECT GROUP KEY ----------
  // IMPORTANT:
  // Do NOT group on Final Invoice No. or Ledger (derived fields)
  const createGroupKey = (row) => {
  
    if (withInventory) {
      
      return JSON.stringify({
        gstin: normalizeString(row['Seller Gstin']),
        // shipToState: normalizeString(row['Ship To State']),
        finalInvoiceNo: normalizeString(row['Final Invoice No.']),
        // tallyLedger: normalizeString(row['Ship To State Tally Ledger']),
        fg: normalizeString(row['FG']),
        // Quantity: safeNumber(row['Quantity']),
      });
    }
    return JSON.stringify({
      gstin: normalizeString(row['Seller Gstin']),
      shipToState: normalizeString(row['Ship To State']),
    });
  };

  
  
  // ---------- BUILD PIVOT ----------
  process1Data.forEach((row) => {
    const gstin = normalizeString(row['Seller Gstin']);
    const shipToState = normalizeString(row['Ship To State']);
    if (!gstin) return;

    const groupKey = createGroupKey(row);

    if (!pivot[groupKey]) {
      pivot[groupKey] = withInventory
        ? {
            'Seller Gstin': gstin,
            'Ship To State': shipToState,
            'Final Invoice No.': '',                     // filled later
            'Ship To State Tally Ledger': '',            // filled later
            'FG': normalizeString(row['FG']),
            'Rate': 0,
            'Sum of Quantity': 0,
            'Sum of Final Taxable Sales Value': 0,
            'Sum of Final CGST Tax': 0,
            'Sum of Final SGST Tax': 0,
            'Sum of Final IGST Tax': 0,
            'Sum of Final Taxable Shipping Value': 0,
            'Sum of Final Shipping CGST Tax': 0,
            'Sum of Final Shipping SGST Tax': 0,
            'Sum of Final Shipping IGST Tax': 0,
            'Sum of Tcs Cgst Amount': 0,
            'Sum of Tcs Sgst Amount': 0,
            'Sum of Tcs Igst Amount': 0,
            'Sum of Final Amount Receivable': 0
          }
        : {
            'Seller Gstin': gstin,
            'Ship To State': shipToState,
            'Final Invoice No.': '',                     // filled later
            'Ship To State Tally Ledger': '',            // filled later
            'Sum of Quantity': 0,
            'Rate': 0,
            'Sum of Final Taxable Sales Value': 0,
            'Sum of Final CGST Tax': 0,
            'Sum of Final SGST Tax': 0,
            'Sum of Final IGST Tax': 0,
            'Sum of Final Taxable Shipping Value': 0,
            'Sum of Final Shipping CGST Tax': 0,
            'Sum of Final Shipping SGST Tax': 0,
            'Sum of Final Shipping IGST Tax': 0,
            'Sum of Tcs Cgst Amount': 0,
            'Sum of Tcs Sgst Amount': 0,
            'Sum of Tcs Igst Amount': 0,
            'Sum of Final Amount Receivable': 0
          };
    }

    const p = pivot[groupKey];

    // ---------- SUM FIELDS (EXACT NAMES PRESERVED) ----------
    p['Sum of Quantity'] += safeNumber(row['Quantity']);
    p['Sum of Final Taxable Sales Value'] += safeNumber(row['Final Taxable Sales Value']) - safeNumber(row['Final Taxable Shipping Value']);
    p['Sum of Final CGST Tax'] += safeNumber(row['Final CGST Tax']) - safeNumber(row['Final Shipping CGST Tax']);
    p['Sum of Final SGST Tax'] += safeNumber(row['Final SGST Tax']) - safeNumber(row['Final Shipping SGST Tax']);
    p['Sum of Final IGST Tax'] += safeNumber(row['Final IGST Tax']) - safeNumber(row['Final Shipping IGST Tax']);
    p['Sum of Final Taxable Shipping Value'] += safeNumber(row['Final Taxable Shipping Value']);
    p['Sum of Final Shipping CGST Tax'] += safeNumber(row['Final Shipping CGST Tax']) ;
    p['Sum of Final Shipping SGST Tax'] += safeNumber(row['Final Shipping SGST Tax']) ;
    p['Sum of Final Shipping IGST Tax'] += safeNumber(row['Final Shipping IGST Tax']) ;
    p['Sum of Tcs Cgst Amount'] += safeNumber(row['Tcs Cgst Amount']);
    p['Sum of Tcs Sgst Amount'] += safeNumber(row['Tcs Sgst Amount']);
    p['Sum of Tcs Igst Amount'] += safeNumber(row['Tcs Igst Amount']);

    const totalTcs =
  safeNumber(p['Sum of Tcs Cgst Amount']) +
  safeNumber(p['Sum of Tcs Sgst Amount']) +
  safeNumber(p['Sum of Tcs Igst Amount']);

p['Sum of Final Amount Receivable'] =
  safeNumber(p['Sum of Final Taxable Sales Value']) +
  safeNumber(p['Sum of Final CGST Tax']) +
  safeNumber(p['Sum of Final SGST Tax']) +
  safeNumber(p['Sum of Final IGST Tax']) +
  safeNumber(p['Sum of Final Taxable Shipping Value']) +
  safeNumber(p['Sum of Final Shipping CGST Tax']) +
  safeNumber(p['Sum of Final Shipping SGST Tax']) +
  safeNumber(p['Sum of Final Shipping IGST Tax']) -
  totalTcs;

  });

  const pivotRows = Object.values(pivot);

  // ---------- DERIVE RATE (AS PER YOUR FORMULA) ----------
  pivotRows.forEach(row => {
    const totalTax =
      safeNumber(row['Sum of Final CGST Tax']) +
      safeNumber(row['Sum of Final SGST Tax']) +
      safeNumber(row['Sum of Final IGST Tax']);

    const taxableValue =
      safeNumber(row['Sum of Final Taxable Sales Value']);

    row['Rate'] =
      taxableValue > 0
        ? +(totalTax / taxableValue).toFixed(6)
        : 0;
  });

  // ---------- DERIVE INVOICE & LEDGER (EXCEL STYLE) ----------
  if (Array.isArray(stateConfigData)) {
    for (const row of pivotRows) {
      const shipToState = String(row['Ship To State'] || '').trim();
      // 🔒 reset every row to avoid stale values
      row['Final Invoice No.'] = '';
      row['Ship To State Tally Ledger'] = '';
  
      if (!shipToState) continue;
  
      // 🔍 find matching state config
      const stateConfig = stateConfigData.find(
        (s) => String(s.States || '').trim() === shipToState
      );
  
      if (!stateConfig) {
        console.warn(`⚠ State not found in config: ${shipToState}`);
        continue;
      }
  
      // ✅ map values
      row['Final Invoice No.'] = stateConfig['Invoice No.'] || '';
      row['Ship To State Tally Ledger'] =
        stateConfig['Amazon Pay Ledger'] || '';
    }
  
    console.log('✓ Mapped Invoice No. and Ledger directly from stateConfigData');
  }
  

  // ---------- VALIDATION TOTALS ----------
const totalProcess1FinalTaxableSalesValue = process1Data.reduce(
  (sum, row) => sum + safeNumber(row['Final Taxable Sales Value']),
  0
);

const totalPivotFinalTaxableSalesValue = pivotRows.reduce(
  (sum, row) => sum + safeNumber(row['Sum of Final Taxable Sales Value']),
  0
);


  return {
    pivotRows,
    validationStats: {
      totalProcess1Rows: process1Data.length,
      pivotRows: pivotRows.length,
  
      totalProcess1FinalTaxableSalesValue,
      totalPivotFinalTaxableSalesValue,
  
      difference: Math.abs(
        totalProcess1FinalTaxableSalesValue - totalPivotFinalTaxableSalesValue
      ),
  
      isValid:
        Math.abs(
          totalProcess1FinalTaxableSalesValue - totalPivotFinalTaxableSalesValue
        ) < 0.01
    }
  };
  
}


/**
 * Generate Tally Ready sheet data from pivot data
 * @param {Array} pivotRows - Pivot data rows
 * @param {string} fileDate - Date on which file is created (format: YYYY-MM-DD)
 * @returns {Object} - Object with headers array and data array (for aoa_to_sheet)
 */
function generateTallyReady(pivotRows, fileDate) {
  const GST_SLABS = [0.05, 0.12, 0.18];
  const GST_TOLERANCE = 0.01; // ±1%

  function normalizeGstRate(rawRate) {
    if (!rawRate || rawRate <= 0) return 0;
  
    // Force numeric
    const rate = Number(rawRate);
  
    // ---------- GST SLAB RANGES ----------
    if (rate >= 0.04 && rate <= 0.06) return 0.05;
    if (rate >= 0.11 && rate <= 0.13) return 0.12;
    if (rate >= 0.17 && rate <= 0.19) return 0.18;
  
    // 🚨 Outside expected GST ranges
    console.warn(`⚠ Unmapped GST rate detected: ${rate}`);
    return 0;
  }
  

   // ---------- SAFE NUMBER ----------
   const safeNumber = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'string') {
      const cleaned = value.replace(/,/g, '').trim();
      const num = Number(cleaned);
      return isNaN(num) ? 0 : num;
    }
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // ---------- NORMALIZE GST RATE IN PIVOT ROWS ----------
  pivotRows.forEach(row => {
    const rawRate = safeNumber(row['Rate']);
    row['_NormalizedRate'] = normalizeGstRate(rawRate);
  });

    // ---------- COLLECT UNIQUE GST RATES ----------
  const uniqueRatesSet = new Set();

  pivotRows.forEach(row => {
    const rate = row['_NormalizedRate'];
    if (rate > 0) {
      uniqueRatesSet.add(rate);
    }
  });

  const uniqueRates = Array.from(uniqueRatesSet).sort((a, b) => a - b);

  // Define headers (including duplicate Discount column)
  const headers = [
    'Vch. Date',
    'Vch. Type',
    'Vch. No.',
    'Ref. No.',
    'Ref. Date',
    'Party Ledger',
    'Sales Ledger',
    'Stock Item',
    'Quantity',
    'Rate',
    'Unit',
    'Discount',
    'Amount',
    'Discount',
  ];

      // ---------- ADD GST HEADERS PER RATE ----------
    uniqueRates.forEach(rate => {
      headers.push(`CGST ${rate / 2}`);
      headers.push(`SGST ${rate / 2}`);
      headers.push(`IGST ${rate}`);
    });
  const tallyRows = [];

 
  // ---------- PARSE FILE DATE ----------
  // fileDate format: YYYY-MM-DD, convert to Date object
  let voucherDate;

  if (fileDate) {
    const parsedDate = new Date(fileDate);
  
    if (!isNaN(parsedDate.getTime())) {
      const year = parsedDate.getFullYear();
      const month = parsedDate.getMonth(); // 0-based
  
      // ✅ Last date of file month
      voucherDate = new Date(year, month + 1, 0);
    } else {
      // fallback
      voucherDate = new Date();
    }
  } else {
    voucherDate = new Date();
  }

  // ---------- BUILD TALLY ROWS (as arrays to handle duplicate column names) ----------
  pivotRows.forEach((row) => {
    const invoiceNo = row['Final Invoice No.'] || '';
    const shipToState = row['Ship To State'] || '';
    const partyLedger = row['Ship To State Tally Ledger'] || 'Amazon Pay Ledger';
    const stockItem = row['FGoods'] || '';
    const quantity = safeNumber(row['Sum of Quantity']);
    const amount = safeNumber(row['Sum of Final Taxable Sales Value']);
    const rate = row['_NormalizedRate'];  // ✅

    const cgst = safeNumber(row['Sum of Final CGST Tax']);
    const sgst = safeNumber(row['Sum of Final SGST Tax']);
    const igst = safeNumber(row['Sum of Final IGST Tax']);
    

    // Skip rows without invoice number
    if (!invoiceNo) {
      console.warn(`⚠ Skipping tally row: Missing Invoice No. for state: ${shipToState}`);
      return;
    }

    // Build row as array in exact order of headers
    const rowArray = [
      voucherDate,           // Vch. Date
      shipToState,           // Vch. Type
      invoiceNo,             // Vch. No.
      invoiceNo,             // Ref. No. (using invoice no)
      voucherDate,           // Ref. Date
      partyLedger,           // Party Ledger
      'Amazon Pay Ledger',   // Sales Ledger
      stockItem,             // Stock Item
      quantity,              // Quantity
      rate,                  // Rate
      '',                    // Unit (user will add)
      '',                    // Discount (first)
      amount,                // Amount
      '',                    // Discount (second)
    ];

    // ---------- GST VALUES PER RATE ----------
  uniqueRates.forEach(r => {
    if (r === rate) {
      rowArray.push(cgst); // CGST r/2
      rowArray.push(sgst); // SGST r/2
      rowArray.push(igst); // IGST r
    } else {
      rowArray.push(0);
      rowArray.push(0);
      rowArray.push(0);
    }
  });

    tallyRows.push(rowArray);
  });

  console.log(`✓ Generated ${tallyRows.length} tally ready rows from ${pivotRows.length} pivot rows`);

  // Return as array of arrays format for aoa_to_sheet
  return {
    headers: headers,
    data: tallyRows
  };
}

/**
 * Main processing function
 * @param {Buffer} rawFileBuffer - Raw file buffer
 * @param {Buffer} skuFileBuffer - SKU file buffer
 * @param {string} brandName - Brand name
 * @param {string} date - Date string
 * @param {Array} skuData - SKU data array (optional)
 * @param {Array} stateConfigData - State config data array (optional)
 * @param {boolean} withInventory - If false, skip FG, Ship To State Tally Ledger, Final Invoice No. columns (default: true)
 */
async function processMacros(rawFileBuffer, skuFileBuffer, brandName, date, skuData = null, stateConfigData = null, withInventory = true) {
    
  let allHeaders = [];
  try {
    // Validate file buffers
    if (!rawFileBuffer || rawFileBuffer.length === 0) {
      throw new Error('Raw file buffer is empty or invalid');
    }

    if (!skuFileBuffer || skuFileBuffer.length === 0) {
      throw new Error('SKU file buffer is empty or invalid');
    }

        // 🔹 STEP 3: Capture ORIGINAL headers BEFORE ExcelJS mutations
        // 🔹 CAPTURE ORIGINAL HEADERS (SOURCE OF TRUTH)
        const originalHeaders = getOriginalHeadersFromXLSX(rawFileBuffer);

        // This will track ALL headers (original + inserted)
         allHeaders = [...originalHeaders];

        console.log('📌 ORIGINAL FILE HEADERS:');
        originalHeaders.forEach((h, i) => {
          console.log(`Header ${i + 1}: ${h}`);
        });

    

    // Always use XLSX library first to read files (it handles both .xls and .xlsx)
    // ExcelJS only supports .xlsx, so we need to convert .xls files first
    let workbook, skuWorkbook;

    // Read raw file with XLSX (handles .xls, .xlsx, and .csv)
    let rawWorkbookXLSX;
    try {
      rawWorkbookXLSX = XLSX.read(rawFileBuffer, { 
        type: 'buffer', 
        cellDates: true,
        cellNF: false,
        cellText: false,
        raw: false
      });
    } catch (xlsxError) {
      throw new Error(`Failed to read raw file: ${xlsxError.message}. Please ensure the file is a valid Excel or CSV file (.xls, .xlsx, or .csv).`);
    }

    if (!rawWorkbookXLSX.SheetNames || rawWorkbookXLSX.SheetNames.length === 0) {
      throw new Error('Raw file has no worksheets');
    }

    // Read SKU file with XLSX (handles both .xls and .xlsx)
    let skuWorkbookXLSX;
    try {
      skuWorkbookXLSX = XLSX.read(skuFileBuffer, { 
        type: 'buffer', 
        cellDates: true,
        cellNF: false,
        cellText: false
      });
    } catch (xlsxError) {
      throw new Error(`Failed to read SKU file: ${xlsxError.message}. Please ensure the file is a valid Excel file (.xls or .xlsx).`);
    }

    if (!skuWorkbookXLSX.SheetNames || skuWorkbookXLSX.SheetNames.length === 0) {
      throw new Error('SKU file has no worksheets');
    }

    // Convert XLSX workbooks to .xlsx buffers for ExcelJS
    let rawFileXLSXBuffer, skuFileXLSXBuffer;
    try {
      rawFileXLSXBuffer = XLSX.write(rawWorkbookXLSX, { 
        type: 'buffer', 
        bookType: 'xlsx',
        compression: true
      });
    } catch (writeError) {
      throw new Error(`Failed to convert raw file to .xlsx format: ${writeError.message}`);
    }

    try {
      skuFileXLSXBuffer = XLSX.write(skuWorkbookXLSX, { 
        type: 'buffer', 
        bookType: 'xlsx',
        compression: true
      });
    } catch (writeError) {
      throw new Error(`Failed to convert SKU file to .xlsx format: ${writeError.message}`);
    }

    // Validate converted buffers
    if (!rawFileXLSXBuffer || rawFileXLSXBuffer.length === 0) {
      throw new Error('Failed to convert raw file to valid .xlsx buffer');
    }

    if (!skuFileXLSXBuffer || skuFileXLSXBuffer.length === 0) {
      throw new Error('Failed to convert SKU file to valid .xlsx buffer');
    }

    // Now load into ExcelJS (which only supports .xlsx)
    try {
      workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(rawFileXLSXBuffer);
    } catch (excelJSError) {
      throw new Error(`Failed to load raw file into ExcelJS: ${excelJSError.message}. The file was successfully read and converted, but ExcelJS cannot process it.`);
    }

    try {
      skuWorkbook = new ExcelJS.Workbook();
      await skuWorkbook.xlsx.load(skuFileXLSXBuffer);
    } catch (excelJSError) {
      throw new Error(`Failed to load SKU file into ExcelJS: ${excelJSError.message}. The file was successfully read and converted, but ExcelJS cannot process it.`);
    }

    // Get or create "amazon-b2c-process1" worksheet
    let ws = workbook.getWorksheet('amazon-b2c-process1');
    if (!ws) {
      ws = workbook.getWorksheet('Process 1') || workbook.getWorksheet('Process1') || workbook.getWorksheet('Proccess 1');
      if (!ws) {
        ws = workbook.worksheets[0];
        if (ws) {
          ws.name = 'amazon-b2c-process1';
        }
      }
    }

    if (!ws) {
      throw new Error('No worksheet found in raw file');
    }

    // ============================================================
    // STEP 0: FILTER ROWS BY TRANSACTION TYPE (MUST BE FIRST!)
    // ============================================================
    // Only keep rows where Transaction Type = "Shipment" or "Refund"
    // All other rows are deleted before any processing begins
    // This ensures all subsequent operations only work on filtered data
    console.log('\n========== MACROS PROCESSING FLOW ==========');
    console.log('Step 0: Filter rows by Transaction Type');
    filterRowsByTransactionType(ws);
    
    let sourceSheet = skuWorkbook.getWorksheet('Source');
    if (!sourceSheet) {
      sourceSheet = skuWorkbook.worksheets[0];
      if (sourceSheet) {
        sourceSheet.name = 'Source';
      }
    }

    if (!sourceSheet) {
      throw new Error('No Source sheet found in SKU file');
    }

    // Add Source sheet to main workbook if not present
    let mainSourceSheet = workbook.getWorksheet('Source');
    if (!mainSourceSheet) {
      mainSourceSheet = workbook.addWorksheet('Source');
      // Copy data from SKU file Source sheet
      sourceSheet.eachRow((row, rowNumber) => {
        const newRow = mainSourceSheet.getRow(rowNumber);
        row.eachCell((cell, colNumber) => {
          newRow.getCell(colNumber).value = cell.value;
        });
      });
    }

    // ============================================================
    // STEP 1: INSERT REQUIRED COLUMNS
    // ============================================================
    console.log('Step 1: Insert required columns');
    console.log(`withInventory: ${withInventory}`);
    insertColumnsAndRenameHeaders(workbook, 'amazon-b2c-process1', withInventory, allHeaders);

    // ============================================================
    // STEP 2: APPLY FORMULAS
    // ============================================================
    console.log('Step 2: Apply formulas');
    applyFormulas(ws, 'Source', withInventory);

    // ============================================================
    // STEP 3: EVALUATE FORMULAS & CONVERT TO JSON
    // ============================================================
    console.log('Step 3: Evaluate formulas and convert to JSON');
    // CRITICAL: Excel PivotTable operates on calculated values, not formula strings.
    // We must evaluate all formulas before converting to JSON for database storage.
    
    // Build column name map from header row
    const headerRow = ws.getRow(1);
    const columnMap = {}; // colNumber -> headerName
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const headerName = String(cell.value || '').trim();
      if (headerName) {
        columnMap[colNumber] = headerName;
      }
    });

    // Create lookup maps from skuData and stateConfigData for manual VLOOKUP calculation
    // These replace the Excel VLOOKUP formulas since the source sheets don't exist in the workbook yet
    // Only needed if withInventory is true
    const skuLookupMap = {}; // SKU -> FG
    if (withInventory && skuData && Array.isArray(skuData)) {
      for (const item of skuData) {
        const sku = String(item.SKU || item.sku || '').trim();
        const fg = item.FG || item.fg || '';
        if (sku) {
          skuLookupMap[sku] = fg;
        }
      }
      console.log(`✓ Created SKU lookup map with ${Object.keys(skuLookupMap).length} entries`);
    } else if (!withInventory) {
      console.log('✓ Skipping SKU lookup map (withInventory=false)');
    }
    
    const stateLookupMap = {}; // State -> { ledger, invoiceNo }
    if (stateConfigData && Array.isArray(stateConfigData)) {
      for (const item of stateConfigData) {
        const state = String(item.States || item.states || '').trim();
        const ledger = item['Amazon Pay Ledger'] || item.amazonPayLedger || '';
        const invoiceNo = item['Invoice No.'] || item.invoiceNo || '';
        if (state) {
          stateLookupMap[state] = { ledger, invoiceNo };
        }
      }
      console.log(`✓ Created State lookup map with ${Object.keys(stateLookupMap).length} entries`);
    } else  {
      console.log('State lookup map not created');
    }

    // Initialize formula evaluator with worksheet and source sheet
    const evaluator = new FormulaEvaluator(ws, mainSourceSheet);

    // Read all data rows and evaluate formulas
    let process1Json = [];
    const lastRow = Math.min(ws.actualRowCount || 50000, 50000);
    const missingSKUsSet = new Set();
    
    // Find SKU and Ship To State column numbers for manual VLOOKUP
    let skuColNumber = null;
    let shipToStateColNumber = null;
    for (const [colNum, headerName] of Object.entries(columnMap)) {
      if (headerName === 'Sku' || headerName === 'SKU') {
        skuColNumber = parseInt(colNum);
      }
      if (headerName === 'Ship To State') {
        shipToStateColNumber = parseInt(colNum);
      }
    }
    
    for (let rowNum = 2; rowNum <= lastRow; rowNum++) {
      const row = ws.getRow(rowNum);
      const rowData = {};
      let hasData = false;
      let rowHasError = false;
      let skuValue = null;

      // Get SKU and Ship To State values first for manual VLOOKUP
      let shipToStateValue = null;
      if (skuColNumber) {
        const skuCell = row.getCell(skuColNumber);
        if (skuCell && skuCell.value) {
          skuValue = String(skuCell.value).trim();
        }
      }
      if (shipToStateColNumber) {
        const stateCell = row.getCell(shipToStateColNumber);
        if (stateCell && stateCell.value) {
          shipToStateValue = String(stateCell.value).trim();
        }
      }

      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const headerName = columnMap[colNumber];
        if (headerName) {
          let cellValue;
          
          // If cell has a formula, evaluate it
          if (cell.formula) {
            const colLetter = evaluator.getColumnLetterFromIndex(colNumber - 1);
            cellValue = evaluator.getCellValue(colLetter, rowNum);
          } else {
            // Use direct cell value
            cellValue = cell.value;
          }
          
          // Check if this is FG column and has empty value (missing SKU)
          // Only check if withInventory is true
          // Note: This check happens before VLOOKUP, so it catches pre-existing empty FG values
          // Missing SKUs from VLOOKUP are caught later after the lookup is performed
          if (withInventory && headerName === 'FG' && (cellValue === '' || cellValue === null || cellValue === undefined)) {
            // Track the missing SKU if we have a SKU value
            if (skuValue) {
              missingSKUsSet.add(skuValue);
              console.warn(`⚠ WARNING: FG column is empty for SKU: "${skuValue}" (row ${row})`);
            }
            rowHasError = true;
            // Don't add this cell value - will skip row
            return;
          }
          
          // Convert null/undefined to empty string (will be handled as 0 in pivot)
          if (cellValue === null || cellValue === undefined) {
            cellValue = '';
          }
          
          rowData[headerName] = cellValue;
          hasData = true;
        }
      });

      // Manually calculate VLOOKUP values using lookup maps
      // This replaces the Excel formulas that can't be evaluated during processing
      // Only apply if withInventory is true
      
        // FG = VLOOKUP(SKU, source-sku, 2, FALSE)
        if (withInventory && skuValue) {
          if (skuLookupMap[skuValue]) {
            rowData['FG'] = skuLookupMap[skuValue];
          } else {
            // SKU is missing from database - track it
            missingSKUsSet.add(skuValue);
            console.warn(`⚠ WARNING: Missing SKU detected: "${skuValue}" (row ${row})`);
            rowData['FG'] = ''; // Set empty to trigger row skip check
            rowHasError = true;
          }
        }
        
        // Ship To State Tally Ledger = VLOOKUP(Ship To State, source-state, 3, 0) -> Amazon Pay Ledger
        if (shipToStateValue && stateLookupMap[shipToStateValue]) {
          rowData['Ship To State Tally Ledger'] = stateLookupMap[shipToStateValue].ledger;
        }
        
        // Final Invoice No. = VLOOKUP(Ship To State, source-state, 2, FALSE) -> Invoice No.
        if (shipToStateValue && stateLookupMap[shipToStateValue]) {
          rowData['Final Invoice No.'] = stateLookupMap[shipToStateValue].invoiceNo;
        }
      

       if (!rowData || Object.keys(rowData).length === 0) {
        continue; // SKIP ghost / empty rows
        }

        
      // Only add row if it has some data and no missing SKU errors
      if (hasData && !rowHasError) {

        // 🔥 FIX 4: Refund quantity safety net (FINAL GUARD)
        if (
          rowData['Transaction Type']?.toLowerCase() === 'refund' &&
          Number(rowData['Quantity']) > 0
        ) {
          rowData['Quantity'] = -Math.abs(Number(rowData['Quantity']));
        }
      
        const fullRow = {};
        for (const header of allHeaders) {
          fullRow[header] = rowData[header] ?? '';
        }

        process1Json.push(fullRow);
      }
    }

    // Check if we have missing SKUs (only if withInventory is true)
    if (withInventory && (missingSKUsSet.size > 0 || evaluator.missingSKUs.size > 0)) {
      const allMissingSKUs = Array.from(new Set([...missingSKUsSet, ...evaluator.missingSKUs]));
      
      // 🔹 LOG WARNING BEFORE THROWING ERROR
      console.warn('\n' + '='.repeat(80));
      console.warn('⚠⚠⚠  MISSING SKU WARNING  ⚠⚠⚠');
      console.warn('='.repeat(80));
      console.warn(`Found ${allMissingSKUs.length} missing SKU(s) in the database:`);
      allMissingSKUs.forEach((sku, index) => {
        console.warn(`  ${index + 1}. "${sku}"`);
      });
      console.warn('='.repeat(80));
      console.warn('These SKUs are not present in the source-sku sheet/database.');
      console.warn('Please add them to the SKU file and try again.');
      console.warn('='.repeat(80) + '\n');
      
      const error = new Error(`Some SKUs are missing from the database: ${allMissingSKUs.join(', ')}`);
      error.missingSKUs = allMissingSKUs;
      throw error;
    }

    console.log(`Converted ${process1Json.length} rows to JSON`);

    // ============================================================
    // STEP 4: GENERATE PIVOT TABLE
    // ============================================================
    console.log('Step 4: Generate Pivot Table');
    // process1Json contains cell values from ExcelJS worksheet
    // Formulas may not be calculated yet, but safeNumber() in pivot will handle formula strings as 0
    // For proper operation, formulas should be evaluated first (by Excel or formula engine)
    // The pivot function safely handles any remaining strings, nulls, or invalid values
    // Pass source sheet to pivot function for Final Invoice No. lookup
    const pivotResult = generatePivot(process1Json, mainSourceSheet, withInventory, stateConfigData);
    const pivotData = pivotResult.pivotRows;
    const pivotValidationStats = pivotResult.validationStats;
    console.log(`Generated ${pivotData.length} pivot rows`);

    // ============================================================
    // STEP 5: CREATE PIVOT 1 & REPORT1 SHEETS
    // ============================================================
    console.log('Step 5: Create Pivot 1 & Report1 sheets');
    const outputWorkbook = XLSX.utils.book_new();
    
    // Manually calculate VLOOKUP values for pivot sheet columns B, C, D (only if withInventory)
    // This implements the VLOOKUP logic in JavaScript for reliable calculation
    // B (Final Invoice No.) = VLOOKUP(Seller Gstin, process1, 'Final Invoice No.', exact match)
    // C (Ship To State Tally Ledger) = VLOOKUP(Seller Gstin, process1, 'Ship To State Tally Ledger', exact match)
    // D (FG) = VLOOKUP(Seller Gstin, process1, 'FG', exact match)
    // if (withInventory) {
    //   // Create a lookup map from process1Json for fast lookups by Seller Gstin
    //   const process1LookupMap = {};
    //   for (const row of process1Json) {
    //     const gstin = row['Seller Gstin'];
    //     if (gstin && !process1LookupMap[gstin]) {
    //       // Store first match (like VLOOKUP with exact match)
    //       process1LookupMap[gstin] = {
    //         'Final Invoice No.': row['Final Invoice No.'] || '',
    //         'Ship To State Tally Ledger': row['Ship To State Tally Ledger'] || '',
    //         'FG': row['FG'] || ''
    //       };
    //     }
    //   }
    //   console.log(`✓ Created lookup map with ${Object.keys(process1LookupMap).length} unique Seller GSTINs`);
      
    //   // Update pivotData with looked-up values
    //   for (const pivotRow of pivotData) {
    //     const gstin = pivotRow['Seller Gstin'];
    //     const lookupData = process1LookupMap[gstin];
    //     if (lookupData) {
    //       pivotRow['Final Invoice No.'] = lookupData['Final Invoice No.'];
    //       pivotRow['Ship To State Tally Ledger'] = lookupData['Ship To State Tally Ledger'];
    //       pivotRow['FG'] = lookupData['FG'];
    //     }
    //   }
    //   console.log(`✓ Applied VLOOKUP values to ${pivotData.length} pivot rows`);
    // } else {
    //   console.log('✓ Skipping pivot VLOOKUP (withInventory=false)');
    // }
    
    const pivotSheet = XLSX.utils.json_to_sheet(pivotData);
    
    XLSX.utils.book_append_sheet(outputWorkbook, pivotSheet, 'amazon-b2c-pivot');
    
    // ============================================================
    // STEP 5.5: CREATE TALLY READY SHEET
    // ============================================================
    console.log('Step 5.5: Create Tally Ready sheet');
    const tallyReadyResult = generateTallyReady(pivotData, date);
    // Build array of arrays: [headers, ...dataRows]
    const tallyReadySheetData = [tallyReadyResult.headers, ...tallyReadyResult.data];
    const tallyReadySheet = XLSX.utils.aoa_to_sheet(tallyReadySheetData);
    XLSX.utils.book_append_sheet(outputWorkbook, tallyReadySheet, 'tally ready');
    console.log(`✓ Added tally ready sheet with ${tallyReadyResult.data.length} rows`);
    
    // Report1 is same as Pivot but values only
    const report1Sheet = XLSX.utils.json_to_sheet(pivotData);
    XLSX.utils.book_append_sheet(outputWorkbook, report1Sheet, 'Report1');

    // ============================================================
    // STEP 6: ADD AMAZON-B2C-PROCESS1 SHEET TO OUTPUT WORKBOOK
    // ============================================================
// Step 6: Add amazon-b2c-process1 sheet to output workbook
console.log('Step 6: Add amazon-b2c-process1 sheet to output workbook');
console.log(`Total headers count: ${allHeaders.length}`);

// 🔹 NEW APPROACH: Use aoa_to_sheet (array of arrays) instead of json_to_sheet
// This gives us complete control over every cell and prevents column truncation
// Ensure every row has all headers, even if missing in worksheet
process1Json = process1Json.map(row => {
  const newRow = { ...row };
  allHeaders.forEach(header => {
    if (!(header in newRow)) {
      newRow[header] = ''; // add empty string for missing columns
    }
  });
  return newRow;
});

// Build array of arrays: [headers, ...dataRows]
// Each row is an array with values in the exact order of allHeaders
const sheetData = [];
// First row: headers
sheetData.push([...allHeaders]); // Create a copy to avoid mutation

// Subsequent rows: data values in the same order as headers
process1Json.forEach(row => {
  const rowArray = allHeaders.map(header => {
    const value = row[header];
    // Handle null/undefined - convert to empty string
    if (value === null || value === undefined) {
      return '';
    }
    return value;
  });
  // Ensure rowArray has exactly allHeaders.length elements
  while (rowArray.length < allHeaders.length) {
    rowArray.push('');
  }
  sheetData.push(rowArray);
});

// 🔹 CRITICAL FIX: Ensure ALL columns are explicitly represented in the first data row
// XLSX may truncate trailing columns if they're completely empty, so we ensure
// at least the first data row has explicit values (even if empty strings) for all columns
if (sheetData.length > 1 && allHeaders.length > 0) {
  const firstDataRow = sheetData[1];
  // Ensure first data row has exactly allHeaders.length elements
  for (let i = 0; i < allHeaders.length; i++) {
    if (firstDataRow[i] === undefined || firstDataRow[i] === null) {
      firstDataRow[i] = ''; // Explicitly set empty string
    }
  }
  // Ensure array length matches header count
  if (firstDataRow.length < allHeaders.length) {
    while (firstDataRow.length < allHeaders.length) {
      firstDataRow.push(''); // Add empty strings for missing columns
    }
  }
  console.log(`✓ Ensured first data row has ${firstDataRow.length} columns (expected ${allHeaders.length})`);
}

console.log(`✓ Built sheet data: ${sheetData.length} rows (1 header + ${sheetData.length - 1} data rows), ${allHeaders.length} columns`);

// Create sheet from array of arrays - this preserves ALL columns
const process1Sheet = XLSX.utils.aoa_to_sheet(sheetData);

// Verify the sheet was created correctly
const sheetRange = XLSX.utils.decode_range(process1Sheet['!ref']);
const actualColCount = sheetRange.e.c + 1; // +1 because column index is 0-based
const actualRowCount = sheetRange.e.r + 1; // +1 because row index is 0-based

console.log(`✓ Sheet created with range: ${process1Sheet['!ref']}`);
console.log(`✓ Sheet has ${actualColCount} columns (expected ${allHeaders.length})`);
console.log(`✓ Sheet has ${actualRowCount} rows (expected ${sheetData.length})`);

if (actualColCount !== allHeaders.length) {
  console.error(`❌ ERROR: Column count mismatch! Expected ${allHeaders.length}, got ${actualColCount}`);
  console.error(`Missing columns: ${allHeaders.length - actualColCount}`);
  
  // Log which headers are actually present
  const presentHeaders = [];
  for (let i = 0; i < actualColCount; i++) {
    const colLetter = XLSX.utils.encode_col(i);
    const headerCellRef = `${colLetter}1`;
    const cell = process1Sheet[headerCellRef];
    presentHeaders.push(cell ? cell.v : `[Missing at col ${i}]`);
  }
  console.error(`Present headers (${presentHeaders.length}):`, presentHeaders.slice(-10)); // Last 10
  console.error(`Expected last 10 headers:`, allHeaders.slice(-10));
  
  // Force the range to include all columns
  const endCol = XLSX.utils.encode_col(allHeaders.length - 1);
  const endRow = sheetData.length;
  process1Sheet['!ref'] = `A1:${endCol}${endRow}`;
  console.log(`✓ Forced range to: ${process1Sheet['!ref']}`);
  
  // Manually ensure all header cells exist
  allHeaders.forEach((header, colIndex) => {
    const colLetter = XLSX.utils.encode_col(colIndex);
    const headerCellRef = `${colLetter}1`;
    if (!process1Sheet[headerCellRef]) {
      process1Sheet[headerCellRef] = { t: 's', v: header };
      console.log(`✓ Created missing header cell: ${headerCellRef} = "${header}"`);
    } else {
      // Ensure header value is correct
      process1Sheet[headerCellRef].v = header;
    }
  });
  
  // Ensure at least first data row has all columns
  if (sheetData.length > 1) {
    allHeaders.forEach((header, colIndex) => {
      const colLetter = XLSX.utils.encode_col(colIndex);
      const cellRef = `${colLetter}2`;
      if (!process1Sheet[cellRef]) {
        process1Sheet[cellRef] = { t: 's', v: '' };
      }
    });
  }
  
  // Re-verify after fix
  const newRange = XLSX.utils.decode_range(process1Sheet['!ref']);
  const newColCount = newRange.e.c + 1;
  console.log(`✓ After fix: Sheet has ${newColCount} columns (expected ${allHeaders.length})`);
} else {
  console.log(`✓ All ${allHeaders.length} columns are present!`);
  // Log last 5 headers to verify
  const lastHeaders = [];
  for (let i = Math.max(0, allHeaders.length - 5); i < allHeaders.length; i++) {
    const colLetter = XLSX.utils.encode_col(i);
    const headerCellRef = `${colLetter}1`;
    const cell = process1Sheet[headerCellRef];
    lastHeaders.push(cell ? cell.v : `[Missing]`);
  }
  console.log(`✓ Last 5 headers verified:`, lastHeaders);
}

XLSX.utils.book_append_sheet(outputWorkbook, process1Sheet, 'amazon-b2c-process1');
console.log(`✓ Added amazon-b2c-process1 sheet with ${process1Json.length} rows`);     
    // ============================================================
    // STEP 7: ADD SOURCE-SKU SHEET TO OUTPUT WORKBOOK
    // ============================================================
    console.log('Step 7: Add source-sku sheet to output workbook');
    try {
      if (skuData && Array.isArray(skuData) && skuData.length > 0) {
        // SKU data structure: [{ SKU, FG }]
        const sourceSkuSheet = XLSX.utils.json_to_sheet(skuData);
        XLSX.utils.book_append_sheet(outputWorkbook, sourceSkuSheet, 'source-sku');
        console.log(`✓ Added source-sku sheet to output workbook with ${skuData.length} rows`);
      } else {
        console.log('⚠ No SKU data available, adding empty sheet with headers');
        // Add empty sheet with headers
        const emptySkuSheet = XLSX.utils.json_to_sheet([], { header: ['SKU', 'FG'] });
        XLSX.utils.book_append_sheet(outputWorkbook, emptySkuSheet, 'source-sku');
        console.log(`✓ Added empty source-sku sheet with headers`);
      }
      console.log(`Output workbook now has ${outputWorkbook.SheetNames.length} sheets: ${outputWorkbook.SheetNames.join(', ')}`);
    } catch (skuError) {
      console.error('Error adding source-sku sheet:', skuError);
      console.error('Error stack:', skuError.stack);
    }

    // ============================================================
    // STEP 8: ADD SOURCE-STATE SHEET TO OUTPUT WORKBOOK
    // ============================================================
    console.log('Step 8: Add source-state sheet to output workbook');
    try {
      if (stateConfigData && Array.isArray(stateConfigData) && stateConfigData.length > 0) {
        // State config data structure: [{ States, 'Amazon Pay Ledger', 'Invoice No.' }]
        const sourceStateSheet = XLSX.utils.json_to_sheet(stateConfigData);
        XLSX.utils.book_append_sheet(outputWorkbook, sourceStateSheet, 'source-state');
        console.log(`✓ Added source-state sheet to output workbook with ${stateConfigData.length} rows`);
      } else {
        console.log('⚠ No state config data available, adding empty sheet with headers');
        // Add empty sheet with headers
        const emptyStateSheet = XLSX.utils.json_to_sheet([], { header: ['States', 'Amazon Pay Ledger', 'Invoice No.'] });
        XLSX.utils.book_append_sheet(outputWorkbook, emptyStateSheet, 'source-state');
        console.log(`✓ Added empty source-state sheet with headers`);
      }
      console.log(`Output workbook now has ${outputWorkbook.SheetNames.length} sheets: ${outputWorkbook.SheetNames.join(', ')}`);
    } catch (stateError) {
      console.error('Error adding source-state sheet:', stateError);
      console.error('Error stack:', stateError.stack);
    }

    // Final verification: Log all sheets in output workbook
    console.log('\n========== FINAL OUTPUT WORKBOOK SHEETS ==========');
    console.log(`Total sheets: ${outputWorkbook.SheetNames.length}`);
    console.log(`Sheet names: ${outputWorkbook.SheetNames.join(', ')}`);
    console.log('===================================================\n');

    // ============================================================
    // FINAL SUM VALIDATION SUMMARY
    // ============================================================
    console.log('========== FINAL SUM VALIDATION SUMMARY ==========');
    console.log(`Process1 "Final Taxable Sales Value" Total: ${pivotValidationStats.totalProcess1FinalTaxableSalesValue.toFixed(2)}`);
    console.log(`Pivot "Sum of Final Taxable Sales Value" Total: ${pivotValidationStats.totalPivotFinalTaxableSalesValue.toFixed(2)}`);
    if (pivotValidationStats.isValid) {
      console.log('✓ SUMS MATCH - Data integrity verified!');
    } else {
      console.warn(`⚠ SUMS DIFFER by ${pivotValidationStats.difference.toFixed(2)}`);
      if (pivotValidationStats.skippedRows > 0) {
        console.warn(`  → Cause: ${pivotValidationStats.skippedRows} rows skipped (missing Seller Gstin)`);
      }
    }
    console.log('===================================================\n');

    console.log('========== MACROS PROCESSING COMPLETE ==========\n');

    return {
      process1Json,
      pivotData,
      workbook, // ExcelJS workbook with formulas
      outputWorkbook, // XLSX workbook with pivot and report
      validationStats: pivotValidationStats // Sum validation statistics
    };
  } catch (error) {
    // Preserve missingSKUs if it exists in the error
    if (error.missingSKUs) {
      const newError = new Error(`Failed to process macros: ${error.message}`);
      newError.missingSKUs = error.missingSKUs;
      throw newError;
    }
    throw new Error(`Failed to process macros: ${error.message}`);
  }
}

module.exports = {
  processMacros
};


