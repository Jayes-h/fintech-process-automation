/**
 * Formula Parser for MIS Agent
 * Parses and evaluates formulas using particular names and MIS column names
 */

/**
 * Tokenize formula string into operands and operators
 * @param {String} formula - Formula string (e.g., "sales amazon-hr + sales amazon-ka")
 * @returns {Array} - Array of tokens
 */
function tokenizeFormula(formula) {
  if (!formula || typeof formula !== 'string') {
    return [];
  }

  // Remove extra spaces and normalize
  const normalized = formula.trim().replace(/\s+/g, ' ');
  
  // Split by operators while keeping operators
  // Operators are: +, -, *, /, and spaces around them
  const tokens = [];
  let currentToken = '';
  
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    
    // Check if current char is an operator (with space handling)
    if (['+', '-', '*', '/'].includes(char)) {
      // Check if this is a unary minus (negative number) or binary operator
      const isUnaryMinus = char === '-' && (
        tokens.length === 0 || 
        ['+', '-', '*', '/', '('].includes(tokens[tokens.length - 1])
      );
      
      if (!isUnaryMinus) {
        // It's a binary operator, save current token and add operator
        if (currentToken.trim()) {
          tokens.push(currentToken.trim());
          currentToken = '';
        }
        tokens.push(char);
      } else {
        // It's a unary minus, keep it as part of the token
        currentToken += char;
      }
    } else if (char === '(' || char === ')') {
      // Parentheses are separate tokens
      if (currentToken.trim()) {
        tokens.push(currentToken.trim());
        currentToken = '';
      }
      tokens.push(char);
    } else {
      // Regular character (including @, %, spaces, etc.)
      currentToken += char;
    }
  }
  
  if (currentToken.trim()) {
    tokens.push(currentToken.trim());
  }
  
  return tokens.filter(t => t.length > 0);
}

/**
 * Evaluate formula using provided values map
 * @param {String} formula - Formula string
 * @param {Object} valuesMap - Map of variable names to values
 * @returns {Number} - Calculated result
 */
function evaluateFormula(formula, valuesMap) {
  console.log(`      [EVALUATE FORMULA] Starting evaluation`);
  console.log(`        Original formula: "${formula}"`);
  
  if (!formula || typeof formula !== 'string') {
    console.log(`        ❌ Invalid formula, returning 0`);
    return 0;
  }

  let expression = '';
  try {
    // Replace variable names with their values
    expression = formula.trim();
    console.log(`        Initial expression: "${expression}"`);
    
    // Sort keys by length (longest first) to avoid partial replacements
    const sortedKeys = Object.keys(valuesMap).sort((a, b) => b.length - a.length);
    console.log(`        Available variables (${sortedKeys.length}):`, sortedKeys.slice(0, 10));
    if (sortedKeys.length > 10) {
      console.log(`        ... and ${sortedKeys.length - 10} more`);
    }
    
    const replacements = [];
    for (const key of sortedKeys) {
      const value = valuesMap[key];
      // Escape special regex characters
      const escapedKey = escapeRegex(key);
      
      // Try multiple matching strategies:
      // 1. Exact match with word boundaries (for simple names without special chars)
      // 2. Exact match without word boundaries (for names with special chars like @, %)
      let regex;
      let beforeReplace = expression;
      
      // Check if key contains special characters that break word boundaries (@, %, #, etc.)
      if (/[@%#\$&]/.test(key)) {
        // Use exact match without word boundaries for special characters
        // Need to escape the key properly for regex
        regex = new RegExp(escapedKey, 'gi');
      } else {
        // Use word boundaries for normal variable names
        regex = new RegExp(`\\b${escapedKey}\\b`, 'gi');
      }
      
      // Try replacement
      const matches = expression.match(regex);
      if (matches) {
        console.log(`        Found ${matches.length} match(es) for "${key}"`);
      }
      
      expression = expression.replace(regex, String(value || 0));
      
      if (beforeReplace !== expression) {
        replacements.push({ key, value, replaced: true });
        console.log(`        ✅ Replaced "${key}" with ${value}`);
        console.log(`           Before: "${beforeReplace}"`);
        console.log(`           After:  "${expression}"`);
      } else {
        // Log if we expected to find it but didn't
        const tokens = tokenizeFormula(formula);
        if (tokens.some(t => t.toLowerCase().includes(key.toLowerCase()))) {
          console.log(`        ⚠️  Expected to find "${key}" but replacement didn't work`);
          console.log(`           Escaped key: "${escapedKey}"`);
          console.log(`           Regex pattern: ${regex}`);
        }
      }
    }
    
    if (replacements.length === 0) {
      console.log(`        ⚠️  No variable replacements made`);
      console.log(`        Available keys in valuesMap:`, Object.keys(valuesMap).slice(0, 20));
      console.log(`        Looking for variables in formula...`);
      const tokens = tokenizeFormula(formula);
      console.log(`        Tokens from formula:`, tokens);
    }
    
    // Remove any remaining non-numeric, non-operator characters (except spaces, parentheses, and decimal points)
    const beforeClean = expression;
    console.log(`        Expression before cleaning: "${expression}"`);
    
    // Step 1: Remove any remaining variable names (alphanumeric with special chars) and replace with 0
    // This handles cases where variables weren't found - match patterns like "Blinkit Branch Transfer Sales @0%"
    // Match: word characters, spaces, @, %, etc. - but be careful not to match numbers
    expression = expression.replace(/[a-zA-Z][a-zA-Z0-9@%_\s]*/g, (match) => {
      // If it contains @ or %, it's likely a variable name that wasn't matched
      if (/[@%]/.test(match)) {
        console.log(`        Replacing unmatched variable pattern: "${match}" with 0`);
        return '0';
      }
      return match;
    });
    
    // Step 2: Remove any remaining @ and % characters (they're not valid in JS expressions)
    // This is critical - % causes "Unexpected number" errors
    if (expression.includes('%')) {
      console.log(`        Removing % characters from expression`);
      expression = expression.replace(/%/g, '');
    }
    if (expression.includes('@')) {
      console.log(`        Removing @ characters from expression`);
      expression = expression.replace(/@/g, '');
    }
    
    // Step 3: Remove any other invalid characters except: numbers, operators (+, -, *, /), spaces, parentheses, decimal points
    expression = expression.replace(/[^0-9+\-*/().\s]/g, '');
    
    // Step 4: Clean up multiple spaces and trim
    expression = expression.replace(/\s+/g, ' ').trim();
    
    // Step 5: Remove any trailing/leading operators that might cause issues
    expression = expression.replace(/^[+\-*/]+|[+\-*/]+$/g, '').trim();
    
    if (beforeClean !== expression) {
      console.log(`        Cleaned expression: "${beforeClean}" -> "${expression}"`);
      console.log(`        ⚠️  Some variables were not found and replaced with 0, or invalid chars removed`);
    }
    
    console.log(`        Final expression to evaluate: "${expression}"`);
    
    // Validate expression before evaluation
    if (!/^[\d+\-*/().\s]+$/.test(expression)) {
      console.error(`        ❌ Invalid expression format: "${expression}"`);
      return 0;
    }
    
    // Evaluate the expression safely using Function constructor
    // In a production environment, consider using a safer expression evaluator library
    let result;
    try {
      result = new Function('return ' + expression)();
    } catch (evalError) {
      console.error(`        ❌ Expression evaluation failed:`, evalError.message);
      console.error(`        Expression: "${expression}"`);
      return 0;
    }
    
    const finalResult = isNaN(result) || !isFinite(result) ? 0 : Number(result);
    
    console.log(`        ✅ Evaluation result: ${result} -> ${finalResult}`);
    return finalResult;
  } catch (error) {
    console.error(`        ❌ Formula evaluation error:`, error.message);
    console.error(`        Formula: "${formula}"`);
    console.error(`        Expression: "${expression || 'N/A'}"`);
    console.error(`        Stack:`, error.stack);
    return 0;
  }
}

/**
 * Escape special regex characters
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract all variable names from formula
 * @param {String} formula - Formula string
 * @returns {Array} - Array of variable names
 */
function extractVariables(formula) {
  if (!formula || typeof formula !== 'string') {
    return [];
  }

  const tokens = tokenizeFormula(formula);
  const variables = [];
  
  for (const token of tokens) {
    if (!['+', '-', '*', '/', '(', ')'].includes(token)) {
      variables.push(token.trim());
    }
  }
  
  return [...new Set(variables)]; // Remove duplicates
}

/**
 * Validate formula syntax
 * @param {String} formula - Formula string
 * @returns {Object} - { valid: Boolean, error: String }
 */
function validateFormula(formula) {
  if (!formula || typeof formula !== 'string') {
    return { valid: false, error: 'Formula is required' };
  }

  const tokens = tokenizeFormula(formula);
  
  if (tokens.length === 0) {
    return { valid: false, error: 'Formula is empty' };
  }

  // Check for balanced parentheses
  let parenCount = 0;
  for (const token of tokens) {
    if (token === '(') parenCount++;
    if (token === ')') parenCount--;
    if (parenCount < 0) {
      return { valid: false, error: 'Unbalanced parentheses' };
    }
  }
  
  if (parenCount !== 0) {
    return { valid: false, error: 'Unbalanced parentheses' };
  }

  return { valid: true };
}

module.exports = {
  tokenizeFormula,
  evaluateFormula,
  extractVariables,
  validateFormula
};

