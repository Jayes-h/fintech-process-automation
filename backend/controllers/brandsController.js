const Brands = require('../models/Brands');
const BrandAgents = require('../models/BrandAgents');
const BrandPortals = require('../models/BrandPortals');
const Agents = require('../models/Agents');
const SellerPortals = require('../models/SellerPortals');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;

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
    const { name, description, contactInfo, settings } = req.body;

    const brand = await Brands.findByPk(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    const updateData = {};

    if (name !== undefined) {
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

      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (contactInfo !== undefined) {
      updateData.contactInfo = contactInfo;
    }

    if (settings !== undefined) {
      updateData.settings = settings;
    }

    await brand.update(updateData);

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
 * Upload brand image
 * POST /api/brands/:id/upload-image
 */
exports.uploadBrandImage = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded'
      });
    }

    const brand = await Brands.findByPk(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads/brands');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const fileExt = path.extname(req.file.originalname);
    const fileName = `${id}-${Date.now()}${fileExt}`;
    const filePath = path.join(uploadsDir, fileName);

    // Save file
    await fs.writeFile(filePath, req.file.buffer);

    // Update brand with image URL
    const imageUrl = `/uploads/brands/${fileName}`;
    await brand.update({ imageUrl });

    res.json({
      success: true,
      data: {
        imageUrl,
        brand: brand
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign agent to brand
 * POST /api/brands/:brandId/agents
 */
exports.assignAgentToBrand = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: 'Agent ID is required'
      });
    }

    // Check if brand exists
    const brand = await Brands.findByPk(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Check if agent exists - try agentId first, then id
    let agent = await Agents.findOne({ where: { agentId } });
    let correctAgentId = agentId;
    
    if (!agent) {
      // Try finding by id in case frontend sent id instead of agentId
      agent = await Agents.findByPk(agentId);
      if (agent) {
        // Use the agentId from the found agent
        correctAgentId = agent.agentId;
      }
    } else {
      // Agent found by agentId, use it
      correctAgentId = agent.agentId;
    }
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: `Agent not found with ID: ${agentId}`
      });
    }

    // Check if already assigned
    const existing = await BrandAgents.findOne({
      where: { brandId, agentId: correctAgentId }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Agent is already assigned to this brand'
      });
    }

    // Create assignment using the correct agentId
    const assignment = await BrandAgents.create({
      brandId,
      agentId: correctAgentId
    });

    res.status(201).json({
      success: true,
      data: assignment,
      message: 'Agent assigned to brand successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove agent from brand
 * DELETE /api/brands/:brandId/agents/:agentId
 */
exports.removeAgentFromBrand = async (req, res, next) => {
  try {
    const { brandId, agentId } = req.params;

    const assignment = await BrandAgents.findOne({
      where: { brandId, agentId }
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Agent is not assigned to this brand'
      });
    }

    await assignment.destroy();

    res.json({
      success: true,
      message: 'Agent removed from brand successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get agents assigned to brand
 * GET /api/brands/:brandId/agents
 */
exports.getBrandAgents = async (req, res, next) => {
  try {
    const { brandId } = req.params;

    const assignments = await BrandAgents.findAll({
      where: { brandId }
    });

    // Fetch agents separately
    const agentIds = assignments.map(a => a.agentId);
    const agentsList = await Agents.findAll({
      where: { agentId: { [Op.in]: agentIds } }
    });

    const agents = agentsList.map(agent => ({
      agentId: agent.agentId,
      agentName: agent.agentName,
      agentDescription: agent.agentDescription,
      id: agent.agentId,
      name: agent.agentName,
      description: agent.agentDescription
    }));

    res.json({
      success: true,
      data: agents
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign portal to brand
 * POST /api/brands/:brandId/portals
 */
exports.assignPortalToBrand = async (req, res, next) => {
  try {
    const { brandId } = req.params;
    const { portalId } = req.body;

    if (!portalId) {
      return res.status(400).json({
        success: false,
        message: 'Portal ID is required'
      });
    }

    // Check if brand exists
    const brand = await Brands.findByPk(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Check if portal exists
    const portal = await SellerPortals.findByPk(portalId);
    if (!portal) {
      return res.status(404).json({
        success: false,
        message: 'Seller portal not found'
      });
    }

    // Check if already assigned
    const existing = await BrandPortals.findOne({
      where: { brandId, sellerPortalId: portalId }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Portal is already assigned to this brand'
      });
    }

    // Create assignment
    const assignment = await BrandPortals.create({
      brandId,
      sellerPortalId: portalId
    });

    res.status(201).json({
      success: true,
      data: assignment,
      message: 'Portal assigned to brand successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove portal from brand
 * DELETE /api/brands/:brandId/portals/:portalId
 */
exports.removePortalFromBrand = async (req, res, next) => {
  try {
    const { brandId, portalId } = req.params;

    const assignment = await BrandPortals.findOne({
      where: { brandId, sellerPortalId: portalId }
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Portal is not assigned to this brand'
      });
    }

    await assignment.destroy();

    res.json({
      success: true,
      message: 'Portal removed from brand successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get portals assigned to brand
 * GET /api/brands/:brandId/portals
 */
exports.getBrandPortals = async (req, res, next) => {
  try {
    const { brandId } = req.params;

    const assignments = await BrandPortals.findAll({
      where: { brandId }
    });

    // Fetch portals separately
    const portalIds = assignments.map(a => a.sellerPortalId);
    const portalsList = await SellerPortals.findAll({
      where: { id: { [Op.in]: portalIds } }
    });

    const portals = portalsList.map(portal => ({
      id: portal.id,
      sellerPortalId: portal.id,
      name: portal.name,
      sellerPortalName: portal.name,
      createdAt: assignments.find(a => a.sellerPortalId === portal.id)?.createdAt
    }));

    res.json({
      success: true,
      data: portals
    });
  } catch (error) {
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
