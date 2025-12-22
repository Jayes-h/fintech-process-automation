const MISData = require('../models/MISData');
const { Op } = require('sequelize');

/**
 * Create new MIS data record
 */
exports.createMISData = async (req, res, next) => {
  try {
    const { brand, agent_id, description, createdBy, tb, tb_working, mis } = req.body;

    // Validation
    if (!brand) {
      return res.status(400).json({ success: false, message: 'Brand is required' });
    }
    if (!createdBy) {
      return res.status(400).json({ success: false, message: 'Created By is required' });
    }
    if (!tb_working || !Array.isArray(tb_working) || tb_working.length === 0) {
      return res.status(400).json({ success: false, message: 'TB Working data is required' });
    }

    const misData = await MISData.create({
      brand,
      agent_id: agent_id || null,
      description: description || 'MIS Report',
      createdBy,
      tb: tb || null,
      tb_working,
      mis: mis || null
    });

    res.status(201).json({ success: true, data: misData });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all MIS data records (with optional filters)
 * Only returns records that have been fully saved (have mis data)
 */
exports.getAllMISData = async (req, res, next) => {
  try {
    const { brand, agent_id, createdBy } = req.query;
    const where = {};

    if (brand) {
      where.brand = brand;
    }
    if (agent_id) {
      where.agent_id = agent_id;
    }
    if (createdBy) {
      where.createdBy = createdBy;
    }

    const misDataRecords = await MISData.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    // Filter to only return records that have mis data (fully saved entries)
    const savedRecords = misDataRecords.filter(record => {
      const mis = record.getDataValue('mis');
      return mis && (Array.isArray(mis) ? mis.length > 0 : Object.keys(mis).length > 0);
    });

    res.json({ success: true, data: savedRecords });
  } catch (error) {
    next(error);
  }
};

/**
 * Get MIS data by ID
 */
exports.getMISDataById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const misData = await MISData.findByPk(id);

    if (!misData) {
      return res.status(404).json({ success: false, message: 'MIS data not found' });
    }

    res.json({ success: true, data: misData });
  } catch (error) {
    next(error);
  }
};

/**
 * Update MIS data
 */
exports.updateMISData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { brand, agent_id, description, createdBy, tb, tb_working, mis } = req.body;

    const misData = await MISData.findByPk(id);

    if (!misData) {
      return res.status(404).json({ success: false, message: 'MIS data not found' });
    }

    await misData.update({
      brand: brand !== undefined ? brand : misData.brand,
      agent_id: agent_id !== undefined ? agent_id : misData.agent_id,
      description: description !== undefined ? description : misData.description,
      createdBy: createdBy !== undefined ? createdBy : misData.createdBy,
      tb: tb !== undefined ? tb : misData.tb,
      tb_working: tb_working !== undefined ? tb_working : misData.tb_working,
      mis: mis !== undefined ? mis : misData.mis
    });

    res.json({ success: true, data: misData });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete MIS data
 */
exports.deleteMISData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const misData = await MISData.findByPk(id);

    if (!misData) {
      return res.status(404).json({ success: false, message: 'MIS data not found' });
    }

    await misData.destroy();

    res.json({ success: true, message: 'MIS data deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get MIS data by brand
 */
exports.getMISDataByBrand = async (req, res, next) => {
  try {
    const { brand } = req.params;
    const misDataRecords = await MISData.findAll({
      where: { brand },
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: misDataRecords });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all unique brands from mis_data table
 */
exports.getAllBrands = async (req, res, next) => {
  try {
    const misDataRecords = await MISData.findAll({
      attributes: ['brand'],
      where: {
        brand: { [Op.ne]: null }
      }
    });

    const brands = [...new Set(misDataRecords.map(r => r.brand).filter(Boolean))];
    res.json({ success: true, data: brands });
  } catch (error) {
    next(error);
  }
};

/**
 * Get MIS format by brand (for reuse)
 */
exports.getMISFormatByBrand = async (req, res, next) => {
  try {
    const { brand } = req.params;
    
    // Get the most recent MIS data for this brand that has mis data
    const misDataRecord = await MISData.findOne({
      where: {
        brand: brand,
        mis: { [Op.ne]: null }
      },
      order: [['createdAt', 'DESC']]
    });

    if (!misDataRecord) {
      return res.json({ success: true, data: null, message: 'No format found for this brand' });
    }

    // Get format from mis_agent table (format is stored there)
    let format = null;
    if (misDataRecord.agent_id) {
      const MISAgent = require('../models/MISAgent');
      const misAgent = await MISAgent.findOne({ where: { agentId: misDataRecord.agent_id } });
      if (misAgent && misAgent.format) {
        format = misAgent.format;
      }
    }

    res.json({ 
      success: true, 
      data: {
        format: format,
        brand: misDataRecord.brand,
        createdAt: misDataRecord.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

