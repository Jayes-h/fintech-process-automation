const express = require('express');
const multer = require('multer');
const router = express.Router();
const macrosController = require('../controllers/macrosController');

// Configure multer for file uploads (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Generate macros (upload raw file and SKU file)
router.post('/generate', 
  upload.fields([
    { name: 'rawFile', maxCount: 1 },
    { name: 'skuFile', maxCount: 1 }
  ]), 
  macrosController.generateMacros
);

// Get all brands
router.get('/brands', macrosController.getAllBrands);

// Get files by seller portal name
router.get('/brand/:sellerPortalName', macrosController.getFilesByBrand);

// Get Process1 data by brandId, sellerPortalId and date
router.get('/process1/:brandId/:sellerPortalId/:date', macrosController.getProcess1Data);

// Get Pivot data by brandId, sellerPortalId and date
router.get('/pivot/:brandId/:sellerPortalId/:date', macrosController.getPivotData);

// Download Process1 file
router.get('/download/process1/:id', macrosController.downloadProcess1);

// Download Pivot file
router.get('/download/pivot/:id', macrosController.downloadPivot);

module.exports = router;


