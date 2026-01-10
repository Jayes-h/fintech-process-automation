const express = require('express');
const multer = require('multer');
const router = express.Router();
const flipkartStateConfigController = require('../controllers/flipkartStateConfigController');

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Get Flipkart state config by brand and seller portal
router.get('/:brandId/:sellerPortalId', flipkartStateConfigController.getStateConfig);

// Get all Flipkart state configs for a brand
router.get('/brand/:brandId', flipkartStateConfigController.getStateConfigsByBrand);

// Upload Flipkart state config file
router.post('/upload/:brandId/:sellerPortalId', upload.single('file'), flipkartStateConfigController.uploadStateConfigFile);

// Create or update Flipkart state config
router.post('/', flipkartStateConfigController.createOrUpdateStateConfig);

// Update Flipkart state config
router.put('/:id', flipkartStateConfigController.updateStateConfig);

// Delete Flipkart state config
router.delete('/:id', flipkartStateConfigController.deleteStateConfig);

module.exports = router;



