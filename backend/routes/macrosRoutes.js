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

// Get files by seller portal name (with optional brandId query param)
router.get('/brand/:sellerPortalName', macrosController.getFilesByBrand);

// Get files by brandId and sellerPortalId
router.get('/files/:brandId/:sellerPortalId', macrosController.getFilesByBrandAndPortal);

// Get Amazon B2C Process1 data by brandId, sellerPortalId and date
router.get('/process1/:brandId/:sellerPortalId/:date', macrosController.getProcess1Data);

// Get Amazon B2C Pivot data by brandId, sellerPortalId and date
router.get('/pivot/:brandId/:sellerPortalId/:date', macrosController.getPivotData);

// Download Amazon B2C Process1 file
router.get('/download/process1/:id', macrosController.downloadProcess1);

// Download Amazon B2C Pivot file
router.get('/download/pivot/:id', macrosController.downloadPivot);

// Download combined Amazon B2C Process1 and Amazon B2C Pivot file (single Excel with two sheets)
router.get('/download/combined/:id', macrosController.downloadCombined);

// Delete macros file
router.delete('/files/:id', macrosController.deleteMacrosFile);

module.exports = router;


