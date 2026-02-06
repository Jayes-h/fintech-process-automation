const ExcelJS = require('exceljs');
const XLSX = require('xlsx-js-style');

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
      const maxRow = Math.min(sourceWs.rowCount || 1000, 1000);

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
  const totalRows = ws.rowCount || 1;
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
  const remainingRows = ws.rowCount || 1;
  console.log(`Total rows after filtering: ${remainingRows} (should be ${keptRows + 1} including header)`);
  
  console.log('✓ Transaction Type filtering completed successfully');
  return keptRows;
}

/**
 * Extract month number from date string (e.g., "2024-01" -> "01", "January 2024" -> "01")
 * @param {string} date - Date string in various formats
 * @returns {string} - Two-digit month number (01-12)
 */
function getMonthNumber(date) {
  if (!date) return '01';
  
  const dateStr = String(date).trim();
  
  // Try YYYY-MM format (e.g., "2024-01")
  const yyyyMmMatch = dateStr.match(/^\d{4}-(\d{2})$/);
  if (yyyyMmMatch) {
    return yyyyMmMatch[1];
  }
  
  // Try MM-YYYY format (e.g., "01-2024")
  const mmYyyyMatch = dateStr.match(/^(\d{2})-\d{4}$/);
  if (mmYyyyMatch) {
    return mmYyyyMatch[1];
  }
  
  // Try month name formats (e.g., "January 2024", "Jan 2024")
  const monthNames = {
    'january': '01', 'jan': '01',
    'february': '02', 'feb': '02',
    'march': '03', 'mar': '03',
    'april': '04', 'apr': '04',
    'may': '05',
    'june': '06', 'jun': '06',
    'july': '07', 'jul': '07',
    'august': '08', 'aug': '08',
    'september': '09', 'sep': '09', 'sept': '09',
    'october': '10', 'oct': '10',
    'november': '11', 'nov': '11',
    'december': '12', 'dec': '12'
  };
  
  const lowerDate = dateStr.toLowerCase();
  for (const [monthName, monthNum] of Object.entries(monthNames)) {
    if (lowerDate.includes(monthName)) {
      return monthNum;
    }
  }
  
  // Try to parse as Date object
  try {
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      const month = parsedDate.getMonth() + 1; // getMonth() is 0-indexed
      return month.toString().padStart(2, '0');
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  return '01'; // Default to January if parsing fails
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
function insertColumnsAndRenameHeaders(workbook, sheetName, withInventory = true) {
  const ws = workbook.getWorksheet(sheetName);
  if (!ws) {
    throw new Error(`Sheet '${sheetName}' not found`);
  }

  // Get actual row and column counts (don't process more than necessary)
  const maxRow = ws.rowCount || 1;
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
    const cessCol = findColumnIndex(ws, 'Compensatory Cess Tax');
    const headers = [
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
    // Insert from right to left (reverse order) so positions don't shift
    for (let i = headers.length - 1; i >= 0; i--) {
      insertColumnAt(cessCol + 1, headers[i]);
    }
    console.log(`Inserted 9 columns after "Compensatory Cess Tax"`);
  } catch (e) {
    console.warn('Could not insert columns after Compensatory Cess Tax:', e.message);
  }

  // 3. Insert 2 columns after "Ship To State" (only if withInventory is true)
  
    try {
      const shipToStateCol = findColumnIndex(ws, 'Ship To State');
      // Insert in reverse order
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
 * STEP 2: Apply Formulas to Ranges (B2B Version)
 * B2B uses IF formulas for Ship To State Tally Ledger and Final Invoice No.
 * comparing Bill From State with Ship To State
 * @param {Worksheet} ws - ExcelJS worksheet
 * @param {string} sourceSheetName - Name of the source sheet
 * @param {string} date - Date string
 * @param {boolean} withInventory - If false, skip FG, Ship To State Tally Ledger, Final Invoice No. formulas
 */
function applyFormulas(ws, sourceSheetName = 'Source', date = '', withInventory = true) {
  const lastRow = Math.min(ws.rowCount || 50000, 50000);

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
  const colBillFromState = getColLetter('Bill From State');
  const colShipToState = getColLetter('Ship To State');
  const colShipToStateTally = getColLetter('Ship To State Tally Ledger');
  const colFinalInvoiceNo = getColLetter('Final Invoice No.');
  const colCgstRate = getColLetter('Cgst Rate');
  
  // Extract month number for B2B Invoice No.
  const monthNum = getMonthNumber(date);
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

  console.log("bill from state",colBillFromState);
  console.log("===================================>00");
  for (let row = 2; row <= lastRow; row++) {
    try {
      // Column FG (O): =VLOOKUP(Sku,'source-sku'!$A$2:$B$229,2,TRUE)
      // Only apply if withInventory is true
      if (withInventory && colSku && colFG) {
        ws.getCell(`${colFG}${row}`).value = {
          formula: `VLOOKUP(${colSku}${row},'source-sku'!$A:$B,2,TRUE)`
        };
      }

      // B2B Logic - Ship To State Tally Ledger: IF(Bill From State = Ship To State, "Amazon B2B Intra-State", "Amazon B2B Inter-State")
      // Only apply if withInventory is true
      if (colBillFromState && colShipToState && colShipToStateTally) {
        console.log("Bill From State: ", ws.getCell(`${colBillFromState}${row}`).value, "Ship To State: ", ws.getCell(`${colShipToState}${row}`).value);
        ws.getCell(`${colShipToStateTally}${row}`).value = {
          formula: `IF(${colBillFromState}${row}=${colShipToState}${row},"Amazon B2B Intra-State","Amazon B2B Inter-State")`
        };
       
      }

      // B2B Logic - Final Invoice No.: IF(Bill From State = Ship To State, "AMZ-INTRA-{month}", "AMZ-INTER-{month}")
      // Only apply if withInventory is true
      if ( colBillFromState && colShipToState && colFinalInvoiceNo) {
        ws.getCell(`${colFinalInvoiceNo}${row}`).value = {
          formula: `IF(${colBillFromState}${row}=${colShipToState}${row},"AMZ-INTRA-${monthNum}","AMZ-INTER-${monthNum}")`
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
        try {
          const colItemPromoAmount = getColLetter('Item Promo Amount'); // CA
          if (colItemPromoAmount) subtractParts.push(`${colItemPromoAmount}${row}`);
        } catch (e) {}
        
        try {
          const colShippingPromoAmount = getColLetter('Shipping Promo Amount'); // CC
          if (colShippingPromoAmount) subtractParts.push(`${colShippingPromoAmount}${row}`);
        } catch (e) {}
        
        // CG = Tcs Igst Amount
        if (colTcsIgstAmount) subtractParts.push(`${colTcsIgstAmount}${row}`); // CG
        
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
      const maxRow = Math.min(sourceSheet.rowCount || 100, 100);
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
 * 4. Filter handling: VBA shows Transaction Type and Final Tax rate as PageFields (filters),
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
function generatePivot(process1Data, sourceSheet , withInventory = true) {
  const pivot = {};
  
  process1Data.forEach(row => {
    console.log(row['Final Invoice No.']);
    return;  
  });
  
  /**
   * Safe numeric conversion matching Excel behavior:
   * - null, undefined, empty string → 0
   * - Non-numeric strings → 0
   * - NaN from parseFloat → 0
   * - Valid numbers → number
   * Excel treats blanks and invalid values as 0 in SUM operations.
   */
  const safeNumber = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    // Handle string numbers (from formulas evaluated to strings)
    if (typeof value === 'string') {
      // Remove commas and whitespace that might be in formatted numbers
      const cleaned = value.replace(/,/g, '').trim();
      const num = Number(cleaned);
      return isNaN(num) ? 0 : num;
    }
    // Handle numbers directly
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // ========== SUM VALIDATION TRACKING ==========
  // Track totals for validation: process1 sum should equal pivot sum
  let totalProcess1FinalTaxableSalesValue = 0;
  let totalSkippedFinalTaxableSalesValue = 0;
  let skippedRowCount = 0;
  let processedRowCount = 0;

  /**
   * Normalize string values for grouping (handle null/undefined as empty string).
   * Excel PivotTable treats empty cells as empty strings in row grouping.
   */
  const normalizeString = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  };

  /**
   * Create stable, collision-free key from grouping fields.
   * Using JSON.stringify ensures:
   * - No collisions from special characters (like '|' in values)
   * - Consistent ordering
   * - Proper handling of empty strings vs null vs undefined
   * 
   * NOTE: Final Invoice No. (column AB) and Ship To State Tally Ledger (column AA) 
   * are already calculated columns in Process 1 data, so we use them directly.
   * 
   * When withInventory=false, only group by Seller Gstin
   */
  const createGroupKey = (row) => {
    if (withInventory) {
      return JSON.stringify({
        gstin: normalizeString(row['Seller Gstin']),
        fg: normalizeString(row['FG']),
        Hsnsac: normalizeString(row['Hsn/sac'])
      });
    } else {
      // Without inventory, only group by Seller Gstin
      return JSON.stringify({
        gstin: normalizeString(row['Seller Gstin']),
        invoice: normalizeString(row['Final Invoice No.']), // Column AB - use directly from Process 1
        ledger: normalizeString(row['Ship To State Tally Ledger']), // Column AA - use directly from Process 1
        Hsnsac: normalizeString(row['Hsn/sac'])
      });
    }
  };

  // Validate that required columns exist in process1Data
  if (process1Data.length > 0) {
    const sampleRow = process1Data[0];
    const requiredColumns = [
      'Seller Gstin',
      'Final Invoice No.',
      'Ship To State Tally Ledger',
      'FG',
      'Quantity',
      'Final Taxable Sales Value',
      'Final CGST Tax',
      'Final SGST Tax',
      'Final IGST Tax',
      'Final Taxable Shipping Value',
      'Final Shipping CGST Tax',
      'Final Shipping SGST Tax',
      'Final Shipping IGST Tax',
      'Tcs Cgst Amount',
      'Tcs Sgst Amount',
      'Tcs Igst Amount',
      'Final Amount Receivable'
    ];
    
    const missingColumns = requiredColumns.filter(col => !(col in sampleRow));
    if (missingColumns.length > 0) {
      console.warn('Missing columns in Process 1 data:', missingColumns);
      console.log('Available columns:', Object.keys(sampleRow).slice(0, 20));
    }
  }

  // Process each row and aggregate by the 4-group key
  // NOTE: Filters (Transaction Type, Final Tax rate) exist in VBA as PageFields
  // but do NOT affect aggregation unless explicitly applied. We process ALL rows.
  process1Data.forEach((row, index) => {
    // Track the Final Taxable Sales Value for this row (before any skipping)
    const rowFinalTaxableSalesValue = safeNumber(row['Final Taxable Sales Value']) - safeNumber(row['Final Taxable Shipping Value']);
    totalProcess1FinalTaxableSalesValue += rowFinalTaxableSalesValue;
    const finalInvoiceNo = normalizeString(row['Final Invoice No.']);
    const shipToStateTallyLedger = normalizeString(row['Ship To State Tally Ledger']);
    // Skip rows with missing essential grouping fields
    const gstin = normalizeString(row['Seller Gstin']);
    if (!gstin) {
      console.warn(`Skipping row ${index + 1}: Missing Seller Gstin (Final Taxable Sales Value: ${rowFinalTaxableSalesValue})`);
      totalSkippedFinalTaxableSalesValue += rowFinalTaxableSalesValue;
      skippedRowCount++;
      return;
    }
    
    processedRowCount++;
    const groupKey = createGroupKey(row);

    // Initialize pivot row if it doesn't exist
    // Use values directly from Process 1 data (columns AA and AB are already calculated)
    if (!pivot[groupKey]) {
      if (withInventory) {
        pivot[groupKey] = {
          'Seller Gstin': gstin,
          'Final Invoice No.': finalInvoiceNo, // Column AB - from Process 1
          'Ship To State Tally Ledger': shipToStateTallyLedger, // Column AA - from Process 1
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
        };
      } else {
        // Without inventory, only include Seller Gstin as grouping column
        pivot[groupKey] = {
          'Seller Gstin': gstin,
          'Final Invoice No.': finalInvoiceNo, // Column AB - from Process 1
          'Ship To State Tally Ledger': shipToStateTallyLedger, // Column AA - from Process 1
          'Hsn/sac': normalizeString(row['Hsn/sac']),
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
    }

    // Sum all data fields using safe numeric conversion
    // Excel PivotTable sums all rows matching the group key
    // Each field uses Function = xlSum (SUM aggregation only)
    // Handle missing columns gracefully by defaulting to 0
    pivot[groupKey]['Sum of Quantity'] += safeNumber(row['Quantity']);
    pivot[groupKey]['Sum of Final Taxable Sales Value'] += safeNumber(row['Final Taxable Sales Value']) ;
    pivot[groupKey]['Sum of Final CGST Tax'] += safeNumber(row['Final CGST Tax']);
    pivot[groupKey]['Sum of Final SGST Tax'] += safeNumber(row['Final SGST Tax']);
    pivot[groupKey]['Sum of Final IGST Tax'] += safeNumber(row['Final IGST Tax']);
    pivot[groupKey]['Sum of Final Taxable Shipping Value'] += safeNumber(row['Final Taxable Shipping Value']);
    pivot[groupKey]['Sum of Final Shipping CGST Tax'] += safeNumber(row['Final Shipping CGST Tax']);
    pivot[groupKey]['Sum of Final Shipping SGST Tax'] += safeNumber(row['Final Shipping SGST Tax']);
    pivot[groupKey]['Sum of Final Shipping IGST Tax'] += safeNumber(row['Final Shipping IGST Tax']);
    pivot[groupKey]['Sum of Tcs Cgst Amount'] += safeNumber(row['Tcs Cgst Amount']);
    pivot[groupKey]['Sum of Tcs Sgst Amount'] += safeNumber(row['Tcs Sgst Amount']);
    pivot[groupKey]['Sum of Tcs Igst Amount'] += safeNumber(row['Tcs Igst Amount']);
    pivot[groupKey]['Sum of Final Amount Receivable'] += safeNumber(row['Final Amount Receivable']);
  });

  // Convert pivot object to array of rows
  // Excel PivotTable in Tabular layout with RepeatAllLabels shows one row per unique group combination
  const pivotRows = Object.values(pivot);

  pivotRows.forEach(row => {
    const totalTax =
      safeNumber(row['Sum of Final CGST Tax']) +
      safeNumber(row['Sum of Final SGST Tax']) +
      safeNumber(row['Sum of Final IGST Tax']);

    const taxableValue =
      safeNumber(row['Sum of Final Taxable Sales Value']);

    row['Rate'] =
      taxableValue != 0
        ? +(totalTax / taxableValue).toFixed(6)
        : 0;
  });


  // Ensure all pivot rows have the correct column order and all required columns
  // Column order depends on withInventory:
  // With inventory: Seller Gstin, Final Invoice No., Ship To State Tally Ledger, FG, then all Sum columns
  // Without inventory: Seller Gstin, then all Sum columns
  const orderedColumns = withInventory ? [
    'Seller Gstin',
    'Final Invoice No.',
    'Ship To State Tally Ledger',
    'FG',
    'Rate',
    'Sum of Quantity',
    'Sum of Final Taxable Sales Value',
    'Sum of Final CGST Tax',
    'Sum of Final SGST Tax',
    'Sum of Final IGST Tax',
    'Sum of Final Taxable Shipping Value',
    'Sum of Final Shipping CGST Tax',
    'Sum of Final Shipping SGST Tax',
    'Sum of Final Shipping IGST Tax',
    'Sum of Tcs Cgst Amount',
    'Sum of Tcs Sgst Amount',
    'Sum of Tcs Igst Amount',
    'Sum of Final Amount Receivable'
  ] : [
    'Seller Gstin',
    'Final Invoice No.',
    'Ship To State Tally Ledger',
    'Hsn/sac',
    'Sum of Quantity',
    'Rate',
    'Sum of Final Taxable Sales Value',
    'Sum of Final CGST Tax',
    'Sum of Final SGST Tax',
    'Sum of Final IGST Tax',
    'Sum of Final Taxable Shipping Value',
    'Sum of Final Shipping CGST Tax',
    'Sum of Final Shipping SGST Tax',
    'Sum of Final Shipping IGST Tax',
    'Sum of Tcs Cgst Amount',
    'Sum of Tcs Sgst Amount',
    'Sum of Tcs Igst Amount',
    'Sum of Final Amount Receivable'
  ];

  
  // Reorder columns in each pivot row to match the required order
  const orderedPivotRows = pivotRows.map(row => {
    const orderedRow = {};
    orderedColumns.forEach(col => {
      orderedRow[col] = row[col] !== undefined ? row[col] : (col.startsWith('Sum of') ? 0 : '');
    });
    return orderedRow;
  });

  // Sort to match Excel PivotTable default sorting (by row fields in order)
  // This ensures consistent output matching VBA behavior
  orderedPivotRows.sort((a, b) => {
    // Sort by: Seller Gstin first
    if (a['Seller Gstin'] !== b['Seller Gstin']) {
      return a['Seller Gstin'].localeCompare(b['Seller Gstin']);
    }
    // If withInventory, also sort by Final Invoice No., Ship To State Tally Ledger, FG
   
      if (a['Final Invoice No.'] !== b['Final Invoice No.']) {
        return a['Final Invoice No.'].localeCompare(b['Final Invoice No.']);
      }
      if (a['Ship To State Tally Ledger'] !== b['Ship To State Tally Ledger']) {
        return a['Ship To State Tally Ledger'].localeCompare(b['Ship To State Tally Ledger']);
      }
      if(withInventory && a['FG'] !== b['FG']) {
      return a['FG'].localeCompare(b['FG']);
      }
  });

  console.log(`Generated ${orderedPivotRows.length} pivot rows from ${process1Data.length} Process 1 rows`);
  if (orderedPivotRows.length > 0) {
    console.log('Pivot table columns:', Object.keys(orderedPivotRows[0]));
  }

  // ========== SUM VALIDATION ==========
  // Calculate total "Sum of Final Taxable Sales Value" from pivot rows
  const totalPivotFinalTaxableSalesValue = orderedPivotRows.reduce(
    (sum, row) => sum + safeNumber(row['Sum of Final Taxable Sales Value']), 
    0
  );
  
  // Validation statistics
  const validationStats = {
    totalProcess1Rows: process1Data.length,
    processedRows: processedRowCount,
    skippedRows: skippedRowCount,
    totalProcess1FinalTaxableSalesValue: totalProcess1FinalTaxableSalesValue,
    totalSkippedFinalTaxableSalesValue: totalSkippedFinalTaxableSalesValue,
    totalPivotFinalTaxableSalesValue: totalPivotFinalTaxableSalesValue,
    difference: Math.abs(totalProcess1FinalTaxableSalesValue - totalPivotFinalTaxableSalesValue),
    isValid: Math.abs(totalProcess1FinalTaxableSalesValue - totalPivotFinalTaxableSalesValue) < 0.01
  };
  
  // Log validation results
  console.log('\n========== SUM VALIDATION ==========');
  console.log(`Process1 Total Rows: ${validationStats.totalProcess1Rows}`);
  console.log(`  - Processed: ${validationStats.processedRows}`);
  console.log(`  - Skipped (missing Seller Gstin): ${validationStats.skippedRows}`);
  console.log(`Process1 Sum of "Final Taxable Sales Value": ${validationStats.totalProcess1FinalTaxableSalesValue.toFixed(2)}`);
  console.log(`  - From skipped rows: ${validationStats.totalSkippedFinalTaxableSalesValue.toFixed(2)}`);
  console.log(`Pivot Sum of "Sum of Final Taxable Sales Value": ${validationStats.totalPivotFinalTaxableSalesValue.toFixed(2)}`);
  console.log(`Difference: ${validationStats.difference.toFixed(2)}`);
  if (validationStats.isValid) {
    console.log('✓ VALIDATION PASSED: Sums match!');
  } else {
    console.warn('⚠ VALIDATION WARNING: Sums do not match!');
    if (validationStats.skippedRows > 0) {
      console.warn(`  → ${validationStats.skippedRows} rows were skipped due to missing Seller Gstin`);
      console.warn(`  → Skipped rows contained ${validationStats.totalSkippedFinalTaxableSalesValue.toFixed(2)} in Final Taxable Sales Value`);
    }
  }
  console.log('=====================================\n');

  // Return both pivot rows and validation stats
  return {
    pivotRows: orderedPivotRows,
    validationStats: validationStats
  };
}

function generateTallyReady(pivotRows, fileDate, withInventory ) {
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
    'Rate per piece',
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
    const seller_gstin = row['Seller Gstin'] || '';
    const invoiceNo = row['Final Invoice No.'] || '';
    const shipToState = row['Ship To State'] || '';
    const partyLedger = row['Ship To State Tally Ledger'] || 'Amazon Pay Ledger';
    const stockItem = withInventory ?  row['FG'] : '';
    const quantity = safeNumber(row['Sum of Quantity']);
    const amount = safeNumber(row['Sum of Final Taxable Sales Value']);
    const rate = row['_NormalizedRate'];  // ✅
    const ratePerPiece =  quantity !== 0 ? +(amount / quantity).toFixed(2) : 0;
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
      seller_gstin,           // Vch. Type
      invoiceNo,             // Vch. No.
      invoiceNo,             // Ref. No. (using invoice no)
      voucherDate,           // Ref. Date
      partyLedger,           // Party Ledger
      'Amazon Pay Ledger',   // Sales Ledger
      stockItem,             // Stock Item
      quantity,              // Quantity
      ratePerPiece,          // Rate per piece
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

function generateShippingTallyReady(pivotRows, fileDate, withInventory ) {

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
    return rawRate;
  }

  function addShipToVchNo(vchNo) {
    if (!vchNo || typeof vchNo !== 'string') return vchNo;
  
    // Insert -SHIP after first 3 characters
    return vchNo.slice(0, 3) + '-SHIP' + vchNo.slice(3);
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
    'Rate',
    'Amount',
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
    const sellerGstin = row['Seller Gstin'] || '';
    const rawInvoiceNo = row['Final Invoice No.'] || '';
    const invoiceNo = addShipToVchNo(rawInvoiceNo);
    const shipToState = row['Ship To State'] || '';
    const partyLedger = row['Ship To State Tally Ledger'] || 'Amazon Pay Ledger';
    const stockItem = withInventory ?  row['FG'] : '';
    const quantity = safeNumber(row['Sum of Quantity']);
    const amount = safeNumber(row['Sum of Final Taxable Shipping Value']);
    const rate = row['_NormalizedRate'];  // ✅
    const cgst = safeNumber(row['Sum of Final Shipping CGST Tax']);
    const sgst = safeNumber(row['Sum of Final Shipping SGST Tax']);
    const igst = safeNumber(row['Sum of Final Shipping IGST Tax']);
    

    // Skip rows without invoice number
    if (!invoiceNo) {
      console.warn(`⚠ Skipping tally row: Missing Invoice No. for state: ${shipToState}`);
      return;
    }

    // Build row as array in exact order of headers
    const rowArray = [
      voucherDate,           // Vch. Date
      sellerGstin,           // Vch. Type
      invoiceNo,             // Vch. No.
      invoiceNo,             // Ref. No. (using invoice no)
      voucherDate,           // Ref. Date
      partyLedger,           // Party Ledger
      'Amazon Pay Ledger',   // Sales Ledger
      rate,                  // Rate
      amount,                // Amount
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

// function generateGstnHsn(pivotRows, fileDate, withInventory ) {

//   function normalizeGstRate(rawRate) {
//     if (!rawRate || rawRate <= 0) return 0;
  
//     // Force numeric
//     const rate = Number(rawRate);
    
//     // ---------- GST SLAB RANGES ----------
//     if (rate >= 0.04 && rate <= 0.06) return 0.05;
//     if (rate >= 0.11 && rate <= 0.13) return 0.12;
//     if (rate >= 0.17 && rate <= 0.19) return 0.18;
  
//     // 🚨 Outside expected GST ranges
//     console.warn(`⚠ Unmapped GST rate detected: ${rate}`);
//     return rawRate;
//   }
  

//    // ---------- SAFE NUMBER ----------
//    const safeNumber = (value) => {
//     if (value === null || value === undefined || value === '') return 0;
//     if (typeof value === 'string') {
//       const cleaned = value.replace(/,/g, '').trim();
//       const num = Number(cleaned);
//       return isNaN(num) ? 0 : num;
//     }
//     const num = Number(value);
//     return isNaN(num) ? 0 : num;
//   };

//   // ---------- NORMALIZE GST RATE IN PIVOT ROWS ----------
//   pivotRows.forEach(row => {
//     const rawRate = safeNumber(row['Rate']);
//     row['_NormalizedRate'] = normalizeGstRate(rawRate);
//   });

//   // ---------- GROUP KEY (same style as your pivot) ----------
//   const createGroupKey = (row) => {
//     return JSON.stringify({
//       gstin: row['Seller Gstin'],
//       hsn: row['Hsn/sac'],
//     });
//   };


//   //   // ---------- COLLECT UNIQUE GST RATES ----------
//   // const uniqueRatesSet = new Set();

//   // pivotRows.forEach(row => {
//   //   const rate = row['_NormalizedRate'];
//   //   if (rate > 0) {
//   //     uniqueRatesSet.add(rate);
//   //   }
//   // });

//   // const uniqueRates = Array.from(uniqueRatesSet).sort((a, b) => a - b);

//   // Define headers (including duplicate Discount column)
//   const headers = [
//     'Seller Gstin',
//     'HSN Code',
//     'Rate',
//     'Sum Of Quantity',
//     'Sum Of Final Taxable Sales Value',
//     'Sum Of CGST',
//     'Sum Of SGST',
//     'Sum Of IGST',
//     'Sum Of Final Shipping CGST Tax',
//     'Sum Of Final Shipping SGST Tax',
//     'Sum Of Final Shipping IGST Tax',
//   ];

//   const tallyRows = [];

 
//   // ---------- BUILD TALLY ROWS (as arrays to handle duplicate column names) ----------
//   pivotRows.forEach((row) => {

//     const gstin = row['Seller Gstin'];
//     const hsn = row['Hsn/sac'];
//     const rate = row['_NormalizedRate'];

//     if (!gstin || !hsn) return;

//     const groupKey = createGroupKey(row);

//     if (!grouped[groupKey]) {
//       grouped[groupKey] = {
//         'Seller Gstin': gstin,
//         'HSN Code': hsn,
//         'Rate': rate,
//         'Sum Of Quantity': 0,
//         'Sum Of Final Taxable Sales Value': 0,
//         'Sum Of CGST Tax': 0,
//         'Sum Of SGST Tax': 0,
//         'Sum Of IGST Tax': 0,
//         'Sum Of Final Taxable Shipping Value': 0,
//         'Sum Of Final Shipping CGST Tax': 0,
//         'Sum Of Final Shipping SGST Tax': 0,
//         'Sum Of Final Shipping IGST Tax': 0
//       };
//     }

//     const g = grouped[groupKey];



//     g['Sum Of Quantity'] += safeNumber(row['Sum of Quantity']);
//     g['Sum Of Final Taxable Sales Value'] += safeNumber(row['Sum of Final Taxable Sales Value']);
//     g['Sum Of CGST Tax'] += safeNumber(row['Sum of Final CGST Tax']);
//     g['Sum Of SGST Tax'] += safeNumber(row['Sum of Final SGST Tax']);
//     g['Sum Of IGST Tax'] += safeNumber(row['Sum of Final IGST Tax']);
//     g['Sum Of Final Taxable Shipping Value'] += safeNumber(row['Sum of Final Taxable Shipping Value']);
//     g['Sum Of Final Shipping CGST Tax'] += safeNumber(row['Sum of Final Shipping CGST Tax']);
//     g['Sum Of Final Shipping SGST Tax'] += safeNumber(row['Sum of Final Shipping SGST Tax']);
//     g['Sum Of Final Shipping IGST Tax'] += safeNumber(row['Sum of Final Shipping IGST Tax']);
    

//     // Skip rows without invoice number
//     // if (!invoiceNo) {
//     //   console.warn(`⚠ Skipping tally row: Missing Invoice No. for state: ${shipToState}`);
//     //   return;
//     // }

//     // Build row as array in exact order of headers
//     const rowArray = [
//       sellerGstin,           // Vch. Type
//       hsncode,
//       rate,                  // Rate
//       quantity,              // Quantity
//       amount,                // Amount
//       cgst,
//       sgst,
//       igst,
//       finalShippingCgst,
//       finalShippingSgst,
//       finalShippingIgst,
//     ];

//     tallyRows.push(rowArray);
//   });

//   console.log(`✓ Generated ${tallyRows.length} tally ready rows from ${pivotRows.length} pivot rows`);

//   // Return as array of arrays format for aoa_to_sheet
//   return {
//     headers: headers,
//     data: tallyRows
//   };
// }

function generateGstnHsn(pivotRows, fileDate, withInventory) {

  function normalizeGstRate(rawRate) {
    if (!rawRate || rawRate <= 0) return 0;

    const rate = Number(rawRate);

    if (rate >= 0.04 && rate <= 0.06) return 0.05;
    if (rate >= 0.11 && rate <= 0.13) return 0.12;
    if (rate >= 0.17 && rate <= 0.19) return 0.18;

    console.warn(`⚠ Unmapped GST rate detected: ${rate}`);
    return rawRate;
  }

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

  const normalizeString = (v) =>
    v === null || v === undefined ? '' : String(v).trim();

  // ---------- NORMALIZE GST RATE ----------
  pivotRows.forEach(row => {
    row['_NormalizedRate'] = normalizeGstRate(safeNumber(row['Rate']));
  });

  // ---------- GROUP KEY (same style as your pivot) ----------
  const createGroupKey = (row) => {
    return JSON.stringify({
      gstin: normalizeString(row['Seller Gstin']),
      hsn: normalizeString(row['Hsn/sac']),
    });
  };

  const headers = [
    'Seller Gstin',
    'HSN Code',
    'Rate',
    'Sum Of Quantity',
    'Sum Of Final Taxable Sales Value',
    'Sum Of CGST Tax',
    'Sum Of SGST Tax',
    'Sum Of IGST Tax',
    'Sum Of Final Taxable Shipping Value',
    'Sum Of Final Shipping CGST Tax',
    'Sum Of Final Shipping SGST Tax',
    'Sum Of Final Shipping IGST Tax',
  ];

  // ---------- GROUPED OBJECT ----------
  const grouped = {};

  pivotRows.forEach((row) => {
    const gstin = normalizeString(row['Seller Gstin']);
    const hsn = normalizeString(row['Hsn/sac']);
    const rate = row['_NormalizedRate'];

    if (!gstin || !hsn) return;

    const groupKey = createGroupKey(row);

    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        'Seller Gstin': gstin,
        'HSN Code': hsn,
        'Rate': rate,
        'Sum Of Quantity': 0,
        'Sum Of Final Taxable Sales Value': 0,
        'Sum Of CGST Tax': 0,
        'Sum Of SGST Tax': 0,
        'Sum Of IGST Tax': 0,
        'Sum Of Final Taxable Shipping Value': 0,
        'Sum Of Final Shipping CGST Tax': 0,
        'Sum Of Final Shipping SGST Tax': 0,
        'Sum Of Final Shipping IGST Tax': 0
      };
    }

    const g = grouped[groupKey];

    g['Sum Of Quantity'] += safeNumber(row['Sum of Quantity']);
    g['Sum Of Final Taxable Sales Value'] += safeNumber(row['Sum of Final Taxable Sales Value']);
    g['Sum Of CGST Tax'] += safeNumber(row['Sum of Final CGST Tax']);
    g['Sum Of SGST Tax'] += safeNumber(row['Sum of Final SGST Tax']);
    g['Sum Of IGST Tax'] += safeNumber(row['Sum of Final IGST Tax']);
    g['Sum Of Final Taxable Shipping Value'] += safeNumber(row['Sum of Final Taxable Shipping Value']);
    g['Sum Of Final Shipping CGST Tax'] += safeNumber(row['Sum of Final Shipping CGST Tax']);
    g['Sum Of Final Shipping SGST Tax'] += safeNumber(row['Sum of Final Shipping SGST Tax']);
    g['Sum Of Final Shipping IGST Tax'] += safeNumber(row['Sum of Final Shipping IGST Tax']);
  });

  // ---------- CONVERT TO ARRAY OF ARRAYS ----------
  const tallyRows = Object.values(grouped).map(row => ([
    row['Seller Gstin'],
    row['HSN Code'],
    row['Rate'],
    row['Sum Of Quantity'],
    row['Sum Of Final Taxable Sales Value'],
    row['Sum Of CGST Tax'],
    row['Sum Of SGST Tax'],
    row['Sum Of IGST Tax'],
    row['Sum Of Final Taxable Shipping Value'],
    row['Sum Of Final Shipping CGST Tax'],
    row['Sum Of Final Shipping SGST Tax'],
    row['Sum Of Final Shipping IGST Tax']
  ]));

  console.log(`✓ Generated ${tallyRows.length} GSTN-HSN grouped rows`);

  return {
    headers,
    data: tallyRows
  };
}

/**
 * Main processing function for Amazon B2B
 * This is a separate implementation from B2C with different logic for:
 * - Ship To State Tally Ledger: Compares Bill From State with Ship To State
 * - Final Invoice No.: Uses AMZ-INTRA-{month} or AMZ-INTER-{month} based on state comparison
 * @param {Buffer} rawFileBuffer - Raw file buffer
 * @param {Buffer} skuFileBuffer - SKU file buffer
 * @param {string} brandName - Brand name
 * @param {string} date - Date string
 * @param {Array} skuData - SKU data array (optional)
 * @param {Array} stateConfigData - State config data array (optional, not used in B2B)
 * @param {boolean} withInventory - If false, skip FG, Ship To State Tally Ledger, Final Invoice No. columns (default: true)
 */
async function processMacrosB2B(rawFileBuffer, skuFileBuffer, brandName, date, skuData = null, stateConfigData = null, withInventory = true) {
  try {
    // Validate file buffers
    if (!rawFileBuffer || rawFileBuffer.length === 0) {
      throw new Error('Raw file buffer is empty or invalid');
    }

    if (!skuFileBuffer || skuFileBuffer.length === 0) {
      throw new Error('SKU file buffer is empty or invalid');
    }

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

    // Get or create "amazon-b2b-process1" worksheet
    let ws = workbook.getWorksheet('amazon-b2b-process1');
    if (!ws) {
      ws = workbook.getWorksheet('Process 1') || workbook.getWorksheet('Process1') || workbook.getWorksheet('Proccess 1');
      if (!ws) {
        ws = workbook.worksheets[0];
        if (ws) {
          ws.name = 'amazon-b2b-process1';
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
    insertColumnsAndRenameHeaders(workbook, 'amazon-b2b-process1', withInventory);

    // ============================================================
    // STEP 2: APPLY FORMULAS
    // ============================================================
    console.log('Step 2: Apply formulas');
    applyFormulas(ws, 'Source', date, withInventory);

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
    
    // B2B does not use stateLookupMap - uses Bill From State vs Ship To State comparison instead
    // Extract month number for B2B Invoice No.
    const monthNum = getMonthNumber(date);
    console.log(`✓ B2B mode - month number: ${monthNum}`);

    // Initialize formula evaluator with worksheet and source sheet
    const evaluator = new FormulaEvaluator(ws, mainSourceSheet);

    // Read all data rows and evaluate formulas
    const process1Json = [];
    const lastRow = Math.min(ws.rowCount || 50000, 50000);
    const missingSKUsSet = new Set();
    
    // Find SKU, Bill From State, and Ship To State column numbers for B2B logic
    let skuColNumber = null;
    let billFromStateColNumber = null;
    let shipToStateColNumber = null;
    for (const [colNum, headerName] of Object.entries(columnMap)) {
      if (headerName === 'Sku' || headerName === 'SKU') {
        skuColNumber = parseInt(colNum);
      }
      if (headerName === 'Bill From State') {
        billFromStateColNumber = parseInt(colNum);
      }
      if (headerName === 'Ship To State') {
        shipToStateColNumber = parseInt(colNum);
      }
    }
    console.log(`✓ B2B columns - Bill From State: col ${billFromStateColNumber}, Ship To State: col ${shipToStateColNumber}`);
    
    for (let rowNum = 2; rowNum <= lastRow; rowNum++) {
      const row = ws.getRow(rowNum);
      const rowData = {};
      let hasData = false;
      let rowHasError = false;
      let skuValue = null;

      // Get SKU, Bill From State, and Ship To State values for B2B logic
      let billFromStateValue = null;
      let shipToStateValue = null;
      if (skuColNumber) {
        const skuCell = row.getCell(skuColNumber);
        if (skuCell && skuCell.value) {
          skuValue = String(skuCell.value).trim();
        }
      }
      if (billFromStateColNumber) {
        const billFromCell = row.getCell(billFromStateColNumber);
        if (billFromCell && billFromCell.value) {
          billFromStateValue = String(billFromCell.value).trim();
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
          if (withInventory && headerName === 'FG' && (cellValue === '' || cellValue === null || cellValue === undefined)) {
            // Track the missing SKU
            if (skuValue) {
              missingSKUsSet.add(skuValue);
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

      // Manually calculate values for B2B (only if withInventory is true)
      if (withInventory) {
        // FG = VLOOKUP(SKU, source-sku, 2, FALSE)
        if (skuValue && skuLookupMap[skuValue]) {
          rowData['FG'] = skuLookupMap[skuValue];
        }
      }
        // B2B Logic: Compare Bill From State (col 18) with Ship To State (col 25)
        // Ship To State Tally Ledger: If same state → "Amazon B2B Intra-State", else → "Amazon B2B Inter-State"
        // Final Invoice No.: If same state → "AMZ-INTRA-{month}", else → "AMZ-INTER-{month}"
        if (billFromStateValue && shipToStateValue) {
          if (billFromStateValue === shipToStateValue) {
            // Same state = Intra-State
            rowData['Ship To State Tally Ledger'] = 'Amazon B2B Intra-State';
            rowData['Final Invoice No.'] = `AMZ-INTRA-${monthNum}`;
          } else {
            // Different states = Inter-State
            rowData['Ship To State Tally Ledger'] = 'Amazon B2B Inter-State';
            rowData['Final Invoice No.'] = `AMZ-INTER-${monthNum}`;
          }
        }
      

      // Only add row if it has some data and no missing SKU errors
      if (hasData && !rowHasError) {
        process1Json.push(rowData);
      }
    }

    // Check if we have missing SKUs (only if withInventory is true)
    if (withInventory && (missingSKUsSet.size > 0 || evaluator.missingSKUs.size > 0)) {
      const allMissingSKUs = Array.from(new Set([...missingSKUsSet, ...evaluator.missingSKUs]));
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
    const pivotResult = generatePivot(process1Json, mainSourceSheet, withInventory);
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
    if (withInventory) {
      // Create a lookup map from process1Json for fast lookups by Seller Gstin
      const process1LookupMap = {};
      for (const row of process1Json) {
        const gstin = row['Seller Gstin'];
        if (gstin && !process1LookupMap[gstin]) {
          // Store first match (like VLOOKUP with exact match)
          process1LookupMap[gstin] = {
            'Final Invoice No.': row['Final Invoice No.'] || '',
            'Ship To State Tally Ledger': row['Ship To State Tally Ledger'] || '',
            'FG': row['FG'] || ''
          };
        }
      }
      console.log(`✓ Created lookup map with ${Object.keys(process1LookupMap).length} unique Seller GSTINs`);
      
      // Update pivotData with looked-up values
      for (const pivotRow of pivotData) {
        const gstin = pivotRow['Seller Gstin'];
        const lookupData = process1LookupMap[gstin];
        if (lookupData) {
          pivotRow['Final Invoice No.'] = lookupData['Final Invoice No.'];
          pivotRow['Ship To State Tally Ledger'] = lookupData['Ship To State Tally Ledger'];
          pivotRow['FG'] = lookupData['FG'];
        }
      }
      console.log(`✓ Applied VLOOKUP values to ${pivotData.length} pivot rows`);
    } else {
      const process1LookupMap = {};
      for (const row of process1Json) {
        const gstin = row['Seller Gstin'];
        if (gstin && !process1LookupMap[gstin]) {
          // Store first match (like VLOOKUP with exact match)
          process1LookupMap[gstin] = {
            'Final Invoice No.': row['Final Invoice No.'] || '',
            'Ship To State Tally Ledger': row['Ship To State Tally Ledger'] || '',
          };
        }
      }
      console.log(`✓ Created lookup map with ${Object.keys(process1LookupMap).length} unique Seller GSTINs`);
      
      // Update pivotData with looked-up values
      for (const pivotRow of pivotData) {
        const gstin = pivotRow['Seller Gstin'];
        const lookupData = process1LookupMap[gstin];
        if (lookupData) {
          pivotRow['Final Invoice No.'] = lookupData['Final Invoice No.'];
          pivotRow['Ship To State Tally Ledger'] = lookupData['Ship To State Tally Ledger'];
        }
      }
      console.log(`✓ Applied VLOOKUP values to ${pivotData.length} pivot rows`);

    }
    
    const pivotSheet = XLSX.utils.json_to_sheet(pivotData);
    
    XLSX.utils.book_append_sheet(outputWorkbook, pivotSheet, 'amazon-b2b-pivot');
    
    // Report1 is same as Pivot but values only
    const report1Sheet = XLSX.utils.json_to_sheet(pivotData);
    XLSX.utils.book_append_sheet(outputWorkbook, report1Sheet, 'Report1');

        // ============================================================
    // STEP 5.5: CREATE TALLY READY SHEET
    // ============================================================
    console.log('Step 5.5: Create Tally Ready sheet');
    const tallyReadyResult = generateTallyReady(pivotData, date, withInventory);
    // Build array of arrays: [headers, ...dataRows]
    const tallyReadySheetData = [tallyReadyResult.headers, ...tallyReadyResult.data];
    const tallyReadySheet = XLSX.utils.aoa_to_sheet(tallyReadySheetData);
    XLSX.utils.book_append_sheet(outputWorkbook, tallyReadySheet, 'tally ready');
    console.log(`✓ Added tally ready sheet with ${tallyReadyResult.data.length} rows`);

        // ============================================================
    // STEP 5.6: CREATE HSN SAC READY SHEET
    // ============================================================
    if(!withInventory){
      console.log('Step 5.6: Create Hsn/sac sheet');
      const gstrhsnResult = generateGstnHsn(pivotData, date, withInventory);
      // Build array of arrays: [headers, ...dataRows]
      const gstrhsnSheetData = [gstrhsnResult.headers, ...gstrhsnResult.data];
      const gstrhsnSheet = XLSX.utils.aoa_to_sheet(gstrhsnSheetData);
      XLSX.utils.book_append_sheet(outputWorkbook, gstrhsnSheet, 'GSTR-HSN');
      console.log(`✓ Added tally ready sheet with ${gstrhsnResult.data.length} rows`);
      }
  
        // ============================================================
    // STEP 5.56: CREATE SHIPPING TALLY READY SHEET
    // ============================================================

      console.log('Step 5.56: Create shipping tally ready sheet');
      const shippingtallyReadyResult = generateShippingTallyReady(pivotData, date, withInventory);
      // Build array of arrays: [headers, ...dataRows]
      const shippingtallyReadySheetData = [shippingtallyReadyResult.headers, ...shippingtallyReadyResult.data];
      const shippingtallyReadySheet = XLSX.utils.aoa_to_sheet(shippingtallyReadySheetData);
      XLSX.utils.book_append_sheet(outputWorkbook, shippingtallyReadySheet, 'shipping tally ready');
      console.log(`✓ Added shipping tally ready sheet with ${shippingtallyReadyResult.data.length} rows`);
  


    // ============================================================
    // STEP 6: ADD AMAZON-B2B-PROCESS1 SHEET TO OUTPUT WORKBOOK
    // ============================================================
    console.log('Step 6: Add amazon-b2b-process1 sheet to output workbook');
    const process1Sheet = XLSX.utils.json_to_sheet(process1Json);
    XLSX.utils.book_append_sheet(outputWorkbook, process1Sheet, 'amazon-b2b-process1');
    console.log(`✓ Added amazon-b2b-process1 sheet with ${process1Json.length} rows`);

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

    // B2B does NOT need source-state sheet - uses Bill From State vs Ship To State comparison
    console.log(`Output workbook has ${outputWorkbook.SheetNames.length} sheets: ${outputWorkbook.SheetNames.join(', ')}`);

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
  processMacrosB2B
};


