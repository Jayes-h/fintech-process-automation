const express = require('express');
const router = express.Router();
const multer = require('multer');
const brandsController = require('../controllers/brandsController');

// Configure multer for image uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get all brands
router.get('/', brandsController.getAllBrands);

// Create new brand
router.post('/', brandsController.createBrand);

// Brand-Agent relationships (must come before /:id routes)
router.post('/:brandId/agents', brandsController.assignAgentToBrand);
router.delete('/:brandId/agents/:agentId', brandsController.removeAgentFromBrand);
router.get('/:brandId/agents', brandsController.getBrandAgents);

// Brand-Portal relationships (must come before /:id routes)
router.post('/:brandId/portals', brandsController.assignPortalToBrand);
router.delete('/:brandId/portals/:portalId', brandsController.removePortalFromBrand);
router.get('/:brandId/portals', brandsController.getBrandPortals);

// Upload brand image (must come before /:id route)
router.post('/:id/upload-image', upload.single('image'), brandsController.uploadBrandImage);

// Get brand by ID (must come after all specific routes)
router.get('/:id', brandsController.getBrandById);

// Update brand
router.put('/:id', brandsController.updateBrand);

// Delete brand
router.delete('/:id', brandsController.deleteBrand);

module.exports = router;
