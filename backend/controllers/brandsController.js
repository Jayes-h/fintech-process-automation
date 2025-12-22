const Brands = require('../models/Brands');
const { Op } = require('sequelize');

/**
 * Get all brands
 * GET /api/brands
 */
exports.getAllBrands = async (req, res, next) => {
  try {
    const brands = await Brands.findAll({
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: brands
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get brand by ID
 * GET /api/brands/:id
 */
exports.getBrandById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const brand = await Brands.findByPk(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    res.json({
      success: true,
      data: brand
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new brand
 * POST /api/brands
 */
exports.createBrand = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Brand name is required'
      });
    }

    // Check if brand with same name already exists
    const existingBrand = await Brands.findOne({
      where: {
        name: { [Op.iLike]: name.trim() }
      }
    });

    if (existingBrand) {
      return res.status(400).json({
        success: false,
        message: 'Brand with this name already exists'
      });
    }

    const brand = await Brands.create({
      name: name.trim()
    });

    res.status(201).json({
      success: true,
      data: brand
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Brand with this name already exists'
      });
    }
    next(error);
  }
};

/**
 * Update brand
 * PUT /api/brands/:id
 */
exports.updateBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const brand = await Brands.findByPk(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Brand name is required'
      });
    }

    // Check if another brand with same name exists
    const existingBrand = await Brands.findOne({
      where: {
        name: { [Op.iLike]: name.trim() },
        id: { [Op.ne]: id }
      }
    });

    if (existingBrand) {
      return res.status(400).json({
        success: false,
        message: 'Brand with this name already exists'
      });
    }

    await brand.update({
      name: name.trim()
    });

    res.json({
      success: true,
      data: brand
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Brand with this name already exists'
      });
    }
    next(error);
  }
};

/**
 * Delete brand
 * DELETE /api/brands/:id
 */
exports.deleteBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const brand = await Brands.findByPk(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    await brand.destroy();

    res.json({
      success: true,
      message: 'Brand deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};


