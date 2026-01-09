const express = require('express');
const multer = require('multer');
const router = express.Router();
const macrosControllerFlipkart = require('../controllers/macrosControllerFlipkart');

// Configure multer for file uploads (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Generate Flipkart macros (upload raw file)
router.post('/generate', 
  upload.fields([
    { name: 'rawFile', maxCount: 1 }
  ]), 
  macrosControllerFlipkart.generateMacros
);

// Get files by brandId and sellerPortalId
router.get('/files/:brandId/:sellerPortalId', macrosControllerFlipkart.getFilesByBrandAndPortal);

// Get Flipkart working file data by brandId, sellerPortalId and date
router.get('/working/:brandId/:sellerPortalId/:date', macrosControllerFlipkart.getWorkingFileData);

// Get Flipkart pivot data by brandId, sellerPortalId and date
router.get('/pivot/:brandId/:sellerPortalId/:date', macrosControllerFlipkart.getPivotData);

// Get Flipkart after-pivot data by brandId, sellerPortalId and date
router.get('/after-pivot/:brandId/:sellerPortalId/:date', macrosControllerFlipkart.getAfterPivotData);

// Download combined Flipkart file
router.get('/download/combined/:id', macrosControllerFlipkart.downloadCombined);

// Delete Flipkart macros file
router.delete('/files/:id', macrosControllerFlipkart.deleteMacrosFile);

module.exports = router;


