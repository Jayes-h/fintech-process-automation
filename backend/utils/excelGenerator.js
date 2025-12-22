const XLSX = require('xlsx-js-style');

/**
 * Generate Excel workbook with Trial Balance, TB Working, and MIS sheets
 * @param {Object} worksheet - Original trial balance worksheet
 * @param {Array} tbWorking - TB Working data
 * @param {Array} months - Array of month names
 * @param {Array} misData - MIS data
 * @returns {Object} - Excel workbook
 */
function buildExcelWorkbook(worksheet, tbWorking, months, misData) {
  const wb = XLSX.utils.book_new();

  const fmt = (v) => (v === 0 || v === '' || v == null ? '-' : v);

  // Read first 4 lines for company info
  const trialData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  const companyInfo = trialData.slice(0, 4).map((r) => r.join(' ')).filter(Boolean);
  const companyInfoRows = companyInfo.length ? companyInfo : ['Company: Unknown'];

  // Helper styles
  const borderAll = {
    top: { style: 'thin', color: { rgb: 'D0D7DE' } },
    bottom: { style: 'thin', color: { rgb: 'D0D7DE' } },
    left: { style: 'thin', color: { rgb: 'D0D7DE' } },
    right: { style: 'thin', color: { rgb: 'D0D7DE' } }
  };

  const titleStyle = {
    font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '2F5597' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderAll
  };

  const companyStyle = {
    font: { bold: true, color: { rgb: '1F4E78' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  };

  const headerStyle = {
    font: { bold: true, color: { rgb: '000000' } },
    fill: { fgColor: { rgb: 'DDEBF7' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderAll
  };

  const particularsStyle = {
    font: { bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: borderAll
  };

  const cellCenter = {
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderAll
  };

  const grandTotalStyle = {
    font: { bold: true, color: { rgb: '000000' } },
    fill: { fgColor: { rgb: 'F2F2F2' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderAll
  };

  // =======================================================
  // 1️⃣ Trial Balance (Original raw sheet)
  // =======================================================
  const tbRawAoa = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  const tbRawSheet = XLSX.utils.aoa_to_sheet(tbRawAoa);
  tbRawSheet['!cols'] = Array.from({ length: Math.max(4, (tbRawAoa[0] || []).length) }).map(() => ({ wch: 20 }));

  const rawMaxR = tbRawAoa.length;
  const rawMaxC = (tbRawAoa[0] || []).length;
  for (let r = 0; r < rawMaxR; r++) {
    for (let c = 0; c < rawMaxC; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = tbRawSheet[addr];
      if (!cell) continue;
      cell.s = {
        border: borderAll,
        alignment: { vertical: 'center', horizontal: 'left' }
      };
    }
  }

  XLSX.utils.book_append_sheet(wb, tbRawSheet, 'Trial Balance');

  // =======================================================
  // 2️⃣ TB Working sheet
  // =======================================================
  const tbHeaders = ['Particulars', ...months, 'Total'];
  const tbOut = [];

  companyInfoRows.forEach((r) => tbOut.push([r]));
  tbOut.push(['TB Working']);
  tbOut.push([]);
  tbOut.push(tbHeaders);

  for (const row of tbWorking) {
    const outRow = tbHeaders.map((h) => (h === 'Particulars' ? row[h] || '' : fmt(row[h])));
    tbOut.push(outRow);
  }

  const grandTotal = ['Grand Total'];
  for (const m of months) {
    const sum = tbWorking.reduce((acc, r) => acc + (Number(r[m]) || 0), 0);
    grandTotal.push(sum === 0 ? '-' : sum);
  }
  const sumTotal = tbWorking.reduce((acc, r) => acc + (Number(r.Total) || 0), 0);
  grandTotal.push(sumTotal === 0 ? '-' : sumTotal);
  tbOut.push(grandTotal);

  const tbWs = XLSX.utils.aoa_to_sheet(tbOut);
  tbWs['!cols'] = [{ wch: 48 }, ...months.map(() => ({ wch: 14 })), { wch: 16 }];

  const totalCols = tbHeaders.length;
  tbWs['!merges'] = [];
  for (let i = 0; i < companyInfoRows.length; i++) {
    tbWs['!merges'].push({ s: { r: i, c: 0 }, e: { r: i, c: totalCols - 1 } });
  }
  const titleRowIndex = companyInfoRows.length;
  tbWs['!merges'].push({ s: { r: titleRowIndex, c: 0 }, e: { r: titleRowIndex, c: totalCols - 1 } });

  const headerRowIndex = companyInfoRows.length + 2;
  for (let r = 0; r < tbOut.length; r++) {
    for (let c = 0; c < totalCols; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = tbWs[addr];
      if (!cell) continue;

      if (r < companyInfoRows.length) cell.s = Object.assign({}, companyStyle, { border: borderAll });
      else if (r === titleRowIndex) cell.s = titleStyle;
      else if (r === headerRowIndex) cell.s = headerStyle;
      else if (tbOut[r][0] === 'Grand Total') cell.s = grandTotalStyle;
      else if (c === 0 && r > headerRowIndex) cell.s = particularsStyle;
      else if (c > 0 && r > headerRowIndex) {
        const raw = tbOut[r][c];
        if (raw !== '-' && !isNaN(Number(raw))) {
          cell.t = 'n';
          cell.v = Number(raw);
          cell.s = Object.assign({}, cellCenter, { numFmt: '#,##0.00' });
        } else {
          cell.s = cellCenter;
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, tbWs, 'TB Working');

  // =======================================================
  // 3️⃣ MIS Sheet
  // =======================================================
  if (misData && misData.length > 0) {
    const misHeaders = ['Particular', ...months, 'YTD'];
    const misOut = [];

    companyInfoRows.forEach((r) => misOut.push([r]));
    misOut.push(['MIS']);
    misOut.push([]);
    misOut.push(misHeaders);

    for (const item of misData) {
      const row = [item.Particular];
      for (const m of months) row.push(fmt(item.Months[m]));
      row.push(fmt(item.Months['YTD']));
      misOut.push(row);
    }

    const misWs = XLSX.utils.aoa_to_sheet(misOut);
    misWs['!cols'] = [{ wch: 48 }, ...months.map(() => ({ wch: 14 })), { wch: 16 }];

    misWs['!merges'] = [];
    const misTotalCols = misHeaders.length;
    for (let i = 0; i < companyInfoRows.length; i++) {
      misWs['!merges'].push({ s: { r: i, c: 0 }, e: { r: i, c: misTotalCols - 1 } });
    }
    const misTitleRowIndex = companyInfoRows.length;
    misWs['!merges'].push({ s: { r: misTitleRowIndex, c: 0 }, e: { r: misTitleRowIndex, c: misTotalCols - 1 } });

    const misHeaderRow = companyInfoRows.length + 2;
    for (let r = 0; r < misOut.length; r++) {
      for (let c = 0; c < misTotalCols; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = misWs[addr];
        if (!cell) continue;

        if (r < companyInfoRows.length) cell.s = Object.assign({}, companyStyle, { border: borderAll });
        else if (r === misTitleRowIndex) cell.s = titleStyle;
        else if (r === misHeaderRow) cell.s = headerStyle;
        else if (c === 0 && r > misHeaderRow) cell.s = particularsStyle;
        else if (c > 0 && r > misHeaderRow) {
          const raw = misOut[r][c];
          if (raw !== '-' && !isNaN(Number(raw))) {
            cell.t = 'n';
            cell.v = Number(raw);
            cell.s = Object.assign({}, cellCenter, { numFmt: '#,##0.00' });
          } else {
            cell.s = cellCenter;
          }
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, misWs, 'MIS');
  }

  return wb;
}

module.exports = {
  buildExcelWorkbook
};















