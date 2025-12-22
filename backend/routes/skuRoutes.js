const express = require('express');
const multer = require('multer');
const router = express.Router();
const skuController = require('../controllers/skuController');

// Configure multer for file uploads (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Get all SKUs (with optional filters)
router.get('/', skuController.getAllSKUs);

// Get SKUs by brand
router.get('/brand/:brandId', skuController.getSKUsByBrand);

// Get SKU by ID
router.get('/:id', skuController.getSKUById);

// Create new SKU
router.post('/', skuController.createSKU);

// Bulk create SKUs
router.post('/bulk', skuController.bulkCreateSKUs);

// Upload Excel file and create SKUs
router.post('/upload', upload.single('file'), skuController.uploadSKUFile);

// Update SKU
router.put('/:id', skuController.updateSKU);

// Delete SKU
router.delete('/:id', skuController.deleteSKU);

module.exports = router;

