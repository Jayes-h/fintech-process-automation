const express = require('express');
const multer = require('multer');
const router = express.Router();
const macrosControllerAmazonB2B = require('../controllers/macrosControllerAmazonB2B');

// Configure multer for file uploads (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Generate Amazon B2B macros (upload raw file)
router.post('/generate', 
  upload.fields([
    { name: 'rawFile', maxCount: 1 },
    { name: 'skuFile', maxCount: 1 }
  ]), 
  macrosControllerAmazonB2B.generateMacros
);

// Get all brands
router.get('/brands', macrosControllerAmazonB2B.getAllBrands);

// Get files by seller portal name (with optional brandId query param)
router.get('/brand/:sellerPortalName', macrosControllerAmazonB2B.getFilesByBrand);

// Get files by brandId and sellerPortalId
router.get('/files/:brandId/:sellerPortalId', macrosControllerAmazonB2B.getFilesByBrandAndPortal);

// Get Amazon B2B Process1 data by brandId, sellerPortalId and date
router.get('/process1/:brandId/:sellerPortalId/:date', macrosControllerAmazonB2B.getProcess1Data);

// Get Amazon B2B Pivot data by brandId, sellerPortalId and date
router.get('/pivot/:brandId/:sellerPortalId/:date', macrosControllerAmazonB2B.getPivotData);

// Download Amazon B2B Process1 file
router.get('/download/process1/:id', macrosControllerAmazonB2B.downloadProcess1);

// Download Amazon B2B Pivot file
router.get('/download/pivot/:id', macrosControllerAmazonB2B.downloadPivot);

// Download combined Amazon B2B Process1 and Pivot file (single Excel with multiple sheets)
router.get('/download/combined/:id', macrosControllerAmazonB2B.downloadCombined);

// Delete macros file
router.delete('/files/:id', macrosControllerAmazonB2B.deleteMacrosFile);

module.exports = router;

