const express = require('express');
const multer = require('multer');
const router = express.Router();
const stateConfigController = require('../controllers/stateConfigController');

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Get state config by brand and seller portal
router.get('/:brandId/:sellerPortalId', stateConfigController.getStateConfig);

// Get all state configs for a brand
router.get('/brand/:brandId', stateConfigController.getStateConfigsByBrand);

// Upload state config file
router.post('/upload/:brandId/:sellerPortalId', upload.single('file'), stateConfigController.uploadStateConfigFile);

// Create or update state config
router.post('/', stateConfigController.createOrUpdateStateConfig);

// Update state config
router.put('/:id', stateConfigController.updateStateConfig);

// Delete state config
router.delete('/:id', stateConfigController.deleteStateConfig);

module.exports = router;

