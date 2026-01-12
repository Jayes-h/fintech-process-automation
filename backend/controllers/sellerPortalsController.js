const SellerPortals = require('../models/SellerPortals');
const { Op } = require('sequelize');

/**
 * Get all seller portals
 * GET /api/seller-portals
 */
exports.getAllSellerPortals = async (req, res, next) => {
  try {
    const sellerPortals = await SellerPortals.findAll({
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: sellerPortals
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get seller portal by ID
 * GET /api/seller-portals/:id
 */
exports.getSellerPortalById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sellerPortal = await SellerPortals.findByPk(id);

    if (!sellerPortal) {
      return res.status(404).json({
        success: false,
        message: 'Seller portal not found'
      });
    }

    res.json({
      success: true,
      data: sellerPortal
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new seller portal
 * POST /api/seller-portals
 */
exports.createSellerPortal = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Seller portal name is required'
      });
    }

    // Check if seller portal with same name already exists
    const existingSellerPortal = await SellerPortals.findOne({
      where: {
        name: { [Op.iLike]: name.trim() }
      }
    });

    if (existingSellerPortal) {
      return res.status(400).json({
        success: false,
        message: 'Seller portal with this name already exists'
      });
    }

    const sellerPortal = await SellerPortals.create({
      name: name.trim()
    });

    res.status(201).json({
      success: true,
      data: sellerPortal
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Seller portal with this name already exists'
      });
    }
    next(error);
  }
};

/**
 * Update seller portal
 * PUT /api/seller-portals/:id
 */
exports.updateSellerPortal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const sellerPortal = await SellerPortals.findByPk(id);

    if (!sellerPortal) {
      return res.status(404).json({
        success: false,
        message: 'Seller portal not found'
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Seller portal name is required'
      });
    }

    // Check if another seller portal with same name exists
    const existingSellerPortal = await SellerPortals.findOne({
      where: {
        name: { [Op.iLike]: name.trim() },
        id: { [Op.ne]: id }
      }
    });

    if (existingSellerPortal) {
      return res.status(400).json({
        success: false,
        message: 'Seller portal with this name already exists'
      });
    }

    await sellerPortal.update({
      name: name.trim()
    });

    res.json({
      success: true,
      data: sellerPortal
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Seller portal with this name already exists'
      });
    }
    next(error);
  }
};

/**
 * Delete seller portal
 * DELETE /api/seller-portals/:id
 */
exports.deleteSellerPortal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sellerPortal = await SellerPortals.findByPk(id);

    if (!sellerPortal) {
      return res.status(404).json({
        success: false,
        message: 'Seller portal not found'
      });
    }

    await sellerPortal.destroy();

    res.json({
      success: true,
      message: 'Seller portal deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};











