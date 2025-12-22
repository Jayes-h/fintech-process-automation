const XLSX = require('xlsx');

// Month detection constants
const MONTH_CANON = [
  ['january', 'January'], ['jan', 'January'],
  ['february', 'February'], ['feb', 'February'],
  ['march', 'March'], ['mar', 'March'],
  ['april', 'April'], ['apr', 'April'],
  ['may', 'May'],
  ['june', 'June'], ['jun', 'June'],
  ['july', 'July'], ['jul', 'July'],
  ['august', 'August'], ['aug', 'August'],
  ['september', 'September'], ['sept', 'September'], ['sep', 'September'],
  ['october', 'October'], ['oct', 'October'],
  ['november', 'November'], ['nov', 'November'],
  ['december', 'December'], ['dec', 'December'],
];

function detectMonthInString(str) {
  if (!str) return null;
  const s = String(str).toLowerCase();
  for (const [needle, canon] of MONTH_CANON) {
    const re = new RegExp(`(^|[^a-z])${needle}([^a-z]|$)`);
    if (re.test(s)) return canon;
  }
  return null;
}

function guessParticularsIndex(headerRows, aoa) {
  const candidates = ['particulars', 'particular', 'account', 'account name', 'ledger', 'ledger name', 'account head', 'head name'];
  const maxCols = headerRows.reduce((m, r) => Math.max(m, r.length), 0);
  
  for (let c = 0; c < maxCols; c++) {
    const texts = [headerRows[0]?.[c] || '', headerRows[1]?.[c] || '', headerRows[2]?.[c] || '']
      .join(' ').toLowerCase();
    if (candidates.some(k => texts.includes(k))) return c;
  }
  
  // Fallback: data-driven heuristic
  for (let c = 0; c < maxCols; c++) {
    let textCount = 0, total = 0;
    for (let r = 8; r < Math.min(aoa.length, 30); r++) {
      const v = aoa[r]?.[c];
      if (v == null || v === '') continue;
      total++;
      if (isNaN(Number(String(v).replace(/[, ]/g, '')))) textCount++;
    }
    if (total > 0 && textCount / total > 0.6) return c;
  }
  return 0;
}

function extractHeaderRowsFromAoa(aoa) {
  const headerRows = [];
  for (let r = 5; r <= 7; r++) {
    const row = Array.isArray(aoa[r]) ? aoa[r] : [];
    headerRows.push(row.map(v => (v == null ? '' : String(v).trim())));
  }
  return headerRows;
}

function buildColHeaders(headerRows) {
  const maxCols = headerRows.reduce((m, r) => Math.max(m, r.length), 0);
  const colHeaders = [];
  for (let c = 0; c < maxCols; c++) {
    const h0 = headerRows[0] && headerRows[0][c] ? headerRows[0][c] : '';
    const h1 = headerRows[1] && headerRows[1][c] ? headerRows[1][c] : '';
    const h2 = headerRows[2] && headerRows[2][c] ? headerRows[2][c] : '';
    colHeaders.push([h0, h1, h2]);
  }
  return colHeaders;
}

function detectMonthsByDebitCreditPairs(colHeaders, particularsIdx) {
  const start = particularsIdx + 1;
  const totalCols = colHeaders.length;
  const months = [];
  const monthColPairs = [];

  for (let c = start; c < totalCols - 1; c++) {
    const combined = [
      ...(colHeaders[c] || []),
      ...(colHeaders[c + 1] || [])
    ].join(' ');

    const monthName = detectMonthInString(combined);
    if (monthName) {
      months.push(monthName);
      monthColPairs.push([c, c + 1]); // [Debit, Credit]
      c++; // skip next since it's part of this month
    }
  }

  return { months, monthColPairs };
}

function normalizeNumber(val) {
  if (val == null || val === '') return 0;
  if (typeof val === 'number') return Math.abs(val);
  let s = String(val).trim();
  s = s.replace(/[()]/g, '').replace(/[, ]/g, '');
  const parsed = parseFloat(s);
  if (!Number.isFinite(parsed)) return 0;
  return Math.abs(parsed);
}

/**
 * Process Trial Balance Excel file and generate TB Working
 * @param {Buffer} fileBuffer - Excel file buffer
 * @returns {Object} - { trialBalance, tbWorking, months, particulars }
 */
function processTrialBalance(fileBuffer) {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }

    // Convert to CSV then to AOA for robust merged cell handling
    const csv = XLSX.utils.sheet_to_csv(worksheet, { blankrows: false });
    const wbCsv = XLSX.read(csv, { type: 'string' });
    const wsCsv = wbCsv.Sheets[wbCsv.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json(wsCsv, { header: 1, raw: true, defval: '' });

    // Extract header rows
    const headerRows = extractHeaderRowsFromAoa(aoa);
    const colHeaders = buildColHeaders(headerRows);
    const particularsIdx = guessParticularsIndex(headerRows, aoa);
    const { months, monthColPairs } = detectMonthsByDebitCreditPairs(colHeaders, particularsIdx);

    // Auto-detect the first data row
    let dataStart = 8;
    for (let r = 8; r < aoa.length; r++) {
      const row = aoa[r] || [];
      const hasName = !!(row[particularsIdx] && String(row[particularsIdx]).trim());
      const hasMonthVal = monthColPairs.some(([debitIdx, creditIdx]) => {
        const d = row[debitIdx];
        const c = row[creditIdx];
        return (d !== '' && d != null) || (c !== '' && c != null);
      });
      if (hasName || hasMonthVal) {
        dataStart = r;
        break;
      }
    }

    // Build TB Working
    const tbWorking = [];
    const particulars = [];

    for (let r = dataStart; r < aoa.length; r++) {
      const row = aoa[r] || [];
      const name = row[particularsIdx];
      const nameStr = name == null ? '' : String(name).trim();
      if (!nameStr) continue;

      const obj = { Particulars: nameStr };
      let total = 0;

      for (let i = 0; i < months.length; i++) {
        const [debitIdx, creditIdx] = monthColPairs[i] || [];
        const debitVal = normalizeNumber(row[debitIdx]);
        const creditVal = normalizeNumber(row[creditIdx]);
        const net = debitVal - creditVal;
        obj[months[i]] = net;
        total += net;
      }

      obj.Total = total;
      tbWorking.push(obj);
      particulars.push(nameStr);
    }

    // Original trial balance as JSON
    const trialBalance = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: null });

    return {
      trialBalance,
      tbWorking,
      months,
      particulars: [...new Set(particulars)], // Unique particulars
      worksheet, // Keep original worksheet for Excel export
      metadata: {
        sheetName,
        particularsIdx,
        monthColPairs,
        dataStart
      }
    };
  } catch (error) {
    throw new Error(`Failed to process trial balance: ${error.message}`);
  }
}

module.exports = {
  processTrialBalance,
  normalizeNumber
};

