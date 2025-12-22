const { evaluateFormula } = require('./formatParser');
const { normalizeNumber } = require('./tbProcessor');

/**
 * Generate MIS based on user-defined format formulas
 * @param {Array} tbWorking - TB Working data
 * @param {Array} months - Array of month names
 * @param {Array} format - Array of format definitions [{ name, formula }]
 * @returns {Array} - Generated MIS data
 */
function generateMIS(tbWorking, months, format) {
  console.log('\n========== MIS GENERATION START ==========');
  console.log('Input Parameters:');
  console.log('- TB Working rows:', tbWorking?.length || 0);
  console.log('- Months:', months);
  console.log('- Format items:', format?.length || 0);
  console.log('- Format details:', JSON.stringify(format, null, 2));
  
  if (!Array.isArray(format) || format.length === 0) {
    console.log('❌ No format provided, returning empty array');
    return [];
  }

  // Create a map of particular names to their values by month
  const particularsMap = {};
  
  console.log('\n--- Step 1: Building Particulars Map ---');
  for (const row of tbWorking) {
    const particularName = row.Particulars;
    if (!particularName) continue;
    
    particularsMap[particularName] = {};
    for (const month of months) {
      const rawValue = row[month] || 0;
      const normalizedValue = normalizeNumber(rawValue);
      particularsMap[particularName][month] = normalizedValue;
      if (normalizedValue !== 0) {
        console.log(`  ${particularName}[${month}]: ${rawValue} -> ${normalizedValue}`);
      }
    }
    const totalValue = normalizeNumber(row.Total || 0);
    particularsMap[particularName]['Total'] = totalValue;
    if (totalValue !== 0) {
      console.log(`  ${particularName}[Total]: ${row.Total || 0} -> ${totalValue}`);
    }
  }
  
  console.log('\nParticulars Map Summary:');
  console.log('- Total particulars:', Object.keys(particularsMap).length);
  console.log('- Particular names:', Object.keys(particularsMap));

  // Generate MIS for each format definition
  const misData = [];
  
  console.log('\n--- Step 2: Processing Format Items ---');
  for (let formatIndex = 0; formatIndex < format.length; formatIndex++) {
    const formatItem = format[formatIndex];
    const { name, formula } = formatItem;
    
    console.log(`\n[Format Item ${formatIndex + 1}/${format.length}]`);
    console.log(`  Name: "${name}"`);
    console.log(`  Formula: "${formula}"`);
    
    if (!name || !formula) {
      console.log(`  ⚠️  Skipping - missing name or formula`);
      continue;
    }

    const misRow = {
      Particular: name,
      Months: {}
    };

    // Calculate for each month
    console.log(`  Processing months...`);
    for (const month of months) {
      const valuesMap = {};
      
      // Add all particulars to values map with month-specific values
      for (const [partName, partData] of Object.entries(particularsMap)) {
        valuesMap[partName] = partData[month] || 0;
      }
      
      // Add previously calculated MIS columns to values map
      for (const prevMis of misData) {
        valuesMap[prevMis.Particular] = prevMis.Months[month] || 0;
      }
      
      console.log(`    Month: ${month}`);
      console.log(`    Values Map (first 5 entries):`, Object.fromEntries(Object.entries(valuesMap).slice(0, 5)));
      if (Object.keys(valuesMap).length > 5) {
        console.log(`    ... and ${Object.keys(valuesMap).length - 5} more entries`);
      }
      
      // Evaluate formula for this month
      const result = evaluateFormula(formula, valuesMap);
      misRow.Months[month] = result;
      console.log(`    Result for ${month}: ${result}`);
    }

    // Calculate YTD (Year to Date)
    const ytdValue = months.reduce((sum, month) => {
      return sum + (misRow.Months[month] || 0);
    }, 0);
    misRow.Months['YTD'] = ytdValue;
    console.log(`  YTD Total: ${ytdValue}`);

    misData.push(misRow);
    console.log(`  ✅ Completed MIS row for "${name}"`);
  }

  console.log('\n========== MIS GENERATION COMPLETE ==========');
  console.log('Final MIS Data:');
  console.log(JSON.stringify(misData, null, 2));
  console.log('Total MIS rows generated:', misData.length);
  console.log('===========================================\n');

  return misData;
}

/**
 * Find account by name (flexible matching)
 * @param {Array} tbWorking - TB Working data
 * @param {String} name - Account name to find
 * @returns {Object|null} - Found account or null
 */
function findAccountByName(tbWorking, name) {
  if (!name) return null;
  const target = String(name).toLowerCase().trim();
  
  let account = tbWorking.find(a => 
    a.Particulars && String(a.Particulars).toLowerCase().trim() === target
  );
  
  if (account) return account;
  
  // Flexible variations
  const alternatives = [
    target.replace('sales ', '').replace(' sales', ''),
    target.replace(/\s+/g, ''),
    target.replace('-', ' '),
    target.replace(' ', '-'),
  ];
  
  for (const alt of alternatives) {
    account = tbWorking.find(acc => 
      acc.Particulars && (
        String(acc.Particulars).toLowerCase().trim() === alt ||
        String(acc.Particulars).toLowerCase().includes(alt) ||
        alt.includes(String(acc.Particulars).toLowerCase().trim())
      )
    );
    if (account) return account;
  }
  
  return null;
}

/**
 * Find accounts by partial name match
 * @param {Array} tbWorking - TB Working data
 * @param {String} partial - Partial name to search
 * @returns {Array} - Array of matching accounts
 */
function findAccountsByPartialName(tbWorking, partial) {
  const p = String(partial).toLowerCase();
  return tbWorking.filter(a => 
    a.Particulars && String(a.Particulars).toLowerCase().includes(p)
  );
}

module.exports = {
  generateMIS,
  findAccountByName,
  findAccountsByPartialName
};


