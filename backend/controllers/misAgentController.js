const MISAgent = require('../models/MISAgent');
const MISData = require('../models/MISData');
const { processTrialBalance } = require('../modules/MISAgent/tbProcessor');
const { generateMIS } = require('../modules/MISAgent/misGenerator');
const { buildExcelWorkbook } = require('../utils/excelGenerator');
const XLSX = require('xlsx-js-style');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

/**
 * Upload and process Trial Balance file
 */
exports.uploadTrialBalance = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { agentId, brand, createdBy } = req.body;
    if (!agentId) {
      return res.status(400).json({ success: false, message: 'Agent ID is required' });
    }
    if (!brand) {
      return res.status(400).json({ success: false, message: 'Brand is required' });
    }
    if (!createdBy) {
      return res.status(400).json({ success: false, message: 'Created By is required' });
    }

    // Process the trial balance file
    // DO NOT save to database yet - keep in memory only
    const result = processTrialBalance(req.file.buffer);

    // Return processed data without saving to database
    // Data will be saved only when user clicks "Save & Generate MIS"
    res.json({
      success: true,
      data: {
        trialBalance: result.trialBalance,
        tbWorking: result.tbWorking,
        months: result.months || [], // Maintain order from processor
        particulars: result.particulars || []
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save & Generate MIS - Final action that saves everything to database
 */
exports.saveAndGenerateMIS = async (req, res, next) => {
  try {
    const { agentId, brand, createdBy, trialBalance, tbWorking, format, months } = req.body;

    // Validation
    if (!agentId) {
      return res.status(400).json({ success: false, message: 'Agent ID is required' });
    }
    if (!brand) {
      return res.status(400).json({ success: false, message: 'Brand is required' });
    }
    if (!createdBy) {
      return res.status(400).json({ success: false, message: 'Created By is required' });
    }
    if (!tbWorking || !Array.isArray(tbWorking) || tbWorking.length === 0) {
      return res.status(400).json({ success: false, message: 'TB Working data is required' });
    }
    if (!format || !Array.isArray(format) || format.length === 0) {
      return res.status(400).json({ success: false, message: 'MIS format is required' });
    }

    // Extract months if not provided
    const extractedMonths = months || Object.keys(tbWorking[0] || {}).filter(key => 
      key !== 'Particulars' && key !== 'Total'
    );

    // Generate MIS
    const misData = generateMIS(tbWorking, extractedMonths, format);

    // Create new MIS Agent record
    const misAgent = await MISAgent.create({
      agentId: uuidv4(), // New unique ID for this upload
      parentAgentId: agentId, // Link to parent agent
      name: 'MIS Generator Agent',
      description: `MIS Report for ${brand}`,
      brand: brand,
      createdBy: createdBy,
      trialBalance: trialBalance || null,
      tbWorking: tbWorking,
      format: format,
      mis: misData
    });

    // Also save to mis_data table
    const misDataRecord = await MISData.create({
      brand: brand,
      agent_id: misAgent.agentId,
      description: `MIS Report for ${brand}`,
      createdBy: createdBy,
      tb: trialBalance || null,
      tb_working: tbWorking,
      mis: misData
    });

    res.json({
      success: true,
      data: {
        agentId: misAgent.agentId,
        misDataId: misDataRecord.id,
        mis: misData,
        months: extractedMonths,
        format: format
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get MIS Agent data
 */
exports.getMISAgent = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const misAgent = await MISAgent.findOne({ where: { agentId } });
    
    if (!misAgent) {
      return res.status(404).json({ success: false, message: 'MIS Agent not found' });
    }

    res.json({ success: true, data: misAgent });
  } catch (error) {
    next(error);
  }
};

/**
 * Save MIS format (formulas)
 */
exports.saveMISFormat = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { format } = req.body;

    if (!Array.isArray(format)) {
      return res.status(400).json({ success: false, message: 'Format must be an array' });
    }

    const misAgent = await MISAgent.findOne({ where: { agentId } });
    
    if (!misAgent) {
      return res.status(404).json({ success: false, message: 'MIS Agent not found' });
    }

    await misAgent.update({ format });

    res.json({ success: true, data: misAgent });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate MIS from format
 */
exports.generateMIS = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { format } = req.body;

    const misAgent = await MISAgent.findOne({ where: { agentId } });
    
    if (!misAgent) {
      return res.status(404).json({ success: false, message: 'MIS Agent not found' });
    }

    if (!misAgent.tbWorking || !Array.isArray(misAgent.tbWorking) || misAgent.tbWorking.length === 0) {
      return res.status(400).json({ success: false, message: 'Trial Balance not processed. Please upload a file first.' });
    }

    // Extract months from tbWorking
    const months = Object.keys(misAgent.tbWorking[0] || {}).filter(key => 
      key !== 'Particulars' && key !== 'Total'
    );

    // Use provided format or saved format
    const formatToUse = format || misAgent.format || [];
    
    if (formatToUse.length === 0) {
      return res.status(400).json({ success: false, message: 'No MIS format defined' });
    }

    // Generate MIS
    const misData = generateMIS(misAgent.tbWorking, months, formatToUse);

    // Update MIS Agent with generated MIS
    await misAgent.update({ mis: misData, format: formatToUse });

    // Also update mis_data table if record exists
    const misDataRecord = await MISData.findOne({ where: { agent_id: agentId } });
    if (misDataRecord) {
      await misDataRecord.update({
        mis: misData,
        tb: misAgent.trialBalance,
        tb_working: misAgent.tbWorking
      });
    }

    res.json({
      success: true,
      data: {
        mis: misData,
        months,
        format: formatToUse
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Download Excel file with all sheets
 */
exports.downloadExcel = async (req, res, next) => {
  try {
    const { agentId } = req.params;

    const misAgent = await MISAgent.findOne({ where: { agentId } });
    
    if (!misAgent) {
      return res.status(404).json({ success: false, message: 'MIS Agent not found' });
    }

    if (!misAgent.tbWorking || !Array.isArray(misAgent.tbWorking) || misAgent.tbWorking.length === 0) {
      return res.status(400).json({ success: false, message: 'Trial Balance not processed' });
    }

    // Extract months
    const months = Object.keys(misAgent.tbWorking[0] || {}).filter(key => 
      key !== 'Particulars' && key !== 'Total'
    );

    // Recreate worksheet from trial balance JSON
    let worksheet;
    if (misAgent.trialBalance && Array.isArray(misAgent.trialBalance) && misAgent.trialBalance.length > 0) {
      const ws = XLSX.utils.json_to_sheet(misAgent.trialBalance);
      worksheet = ws;
    } else {
      // Create a minimal worksheet if trial balance is not available
      worksheet = XLSX.utils.aoa_to_sheet([['Trial Balance Data']]);
    }

    // Build Excel workbook
    const workbook = buildExcelWorkbook(
      worksheet,
      misAgent.tbWorking,
      months,
      misAgent.mis || []
    );

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="MIS_Report_${agentId}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all particulars from TB Working
 * Accepts optional brand parameter to filter by brand
 */
exports.getParticulars = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { brand } = req.query;

    const where = { agentId };
    if (brand) {
      where.brand = brand;
    }

    const misAgent = await MISAgent.findOne({ where });
    
    if (!misAgent) {
      return res.status(404).json({ success: false, message: 'MIS Agent not found' });
    }

    // If brand filter is provided, ensure it matches
    if (brand && misAgent.brand !== brand) {
      return res.json({ success: true, data: { particulars: [] } });
    }

    if (!misAgent.tbWorking || !Array.isArray(misAgent.tbWorking)) {
      return res.json({ success: true, data: { particulars: [] } });
    }

    const particulars = misAgent.tbWorking
      .map(row => row.Particulars)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index); // Unique

    res.json({ success: true, data: { particulars, brand: misAgent.brand } });
  } catch (error) {
    next(error);
  }
};

/**
 * List all MIS Agent records (with optional brand filter)
 */
exports.listMISAgents = async (req, res, next) => {
  try {
    const { brand } = req.query;
    const where = {};
    
    if (brand) {
      where.brand = brand;
    }

    const misAgents = await MISAgent.findAll({
      where,
      order: [['createdAt', 'DESC']],
      attributes: ['agentId', 'brand', 'createdBy', 'createdAt', 'updatedAt', 'name', 'mis']
    });

    // Filter to only return records that have mis data (fully saved entries)
    // This ensures in-progress entries don't appear on dashboard
    const savedFiles = [];
    for (const agent of misAgents) {
      const mis = agent.getDataValue('mis');
      if (mis && Array.isArray(mis) && mis.length > 0) {
        // Only include records that have been fully saved (have MIS data)
        savedFiles.push({
          agentId: agent.agentId,
          brand: agent.brand,
          createdBy: agent.createdBy,
          createdAt: agent.createdAt,
          updatedAt: agent.updatedAt,
          name: agent.name
        });
      }
    }

    res.json({ success: true, data: savedFiles });
  } catch (error) {
    next(error);
  }
};

/**
 * Get formats by brand
 */
exports.getFormatsByBrand = async (req, res, next) => {
  try {
    const { brand } = req.params;

    const misAgents = await MISAgent.findAll({
      where: {
        brand: brand,
        savedFormat: { [Op.ne]: null }
      },
      attributes: ['agentId', 'savedFormat', 'formatBrand', 'createdBy', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    const formats = misAgents
      .filter(agent => agent.savedFormat && Array.isArray(agent.savedFormat) && agent.savedFormat.length > 0)
      .map(agent => ({
        agentId: agent.agentId,
        format: agent.savedFormat,
        formatBrand: agent.formatBrand,
        createdBy: agent.createdBy,
        createdAt: agent.createdAt
      }));

    res.json({ success: true, data: formats });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all saved formats from all brands
 * Returns formats from records that have been fully saved (have mis data)
 */
exports.getAllFormats = async (req, res, next) => {
  try {
    // Get all MIS agents that have been fully saved (have mis data)
    const misAgents = await MISAgent.findAll({
      attributes: ['agentId', 'format', 'savedFormat', 'formatBrand', 'brand', 'createdBy', 'createdAt', 'mis'],
      order: [['createdAt', 'DESC']]
    });

    const formats = [];
    
    for (const agent of misAgents) {
      const mis = agent.getDataValue('mis');
      // Only include formats from fully saved entries (have mis data)
      if (mis && Array.isArray(mis) && mis.length > 0) {
        const format = agent.getDataValue('format');
        const savedFormat = agent.getDataValue('savedFormat');
        const brand = agent.getDataValue('brand');
        const formatBrand = agent.getDataValue('formatBrand') || brand;
        
        // Include format if it exists
        if (format && Array.isArray(format) && format.length > 0) {
          formats.push({
            agentId: agent.agentId,
            format: format,
            brand: brand,
            formatBrand: formatBrand,
            createdBy: agent.createdBy,
            createdAt: agent.createdAt
          });
        }
        
        // Include savedFormat if it exists and is different from format
        if (savedFormat && Array.isArray(savedFormat) && savedFormat.length > 0) {
          // Avoid duplicates if savedFormat is same as format
          const formatStr = JSON.stringify(format);
          const savedFormatStr = JSON.stringify(savedFormat);
          if (formatStr !== savedFormatStr) {
            formats.push({
              agentId: agent.agentId,
              format: savedFormat,
              brand: brand,
              formatBrand: formatBrand,
              createdBy: agent.createdBy,
              createdAt: agent.createdAt
            });
          }
        }
      }
    }

    // Sort by most recent first
    formats.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, data: formats });
  } catch (error) {
    next(error);
  }
};

/**
 * Save a format for reuse
 */
exports.saveFormat = async (req, res, next) => {
  try {
    const { agentId, format, formatBrand } = req.body;

    if (!format || !Array.isArray(format)) {
      return res.status(400).json({ success: false, message: 'Format must be an array' });
    }

    const misAgent = await MISAgent.findOne({ where: { agentId } });
    
    if (!misAgent) {
      return res.status(404).json({ success: false, message: 'MIS Agent not found' });
    }

    await misAgent.update({
      savedFormat: format,
      formatBrand: formatBrand || misAgent.brand
    });

    res.json({ success: true, data: misAgent });
  } catch (error) {
    next(error);
  }
};

