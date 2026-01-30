const express = require('express');
const multer = require('multer');
const router = express.Router();
const macrosControllerMyntra = require('../controllers/macrosControllerMyntra');

// Configure multer for file uploads (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Generate Myntra macros (upload 3 CSV files: rtoFile, packedFile, rtFile)
router.post('/generate', upload.fields([
  { name: 'rtoFile', maxCount: 1 },
  { name: 'packedFile', maxCount: 1 },
  { name: 'rtFile', maxCount: 1 }
]), macrosControllerMyntra.generateMacros);

// Get files by brandId and sellerPortalId
router.get('/files/:brandId/:sellerPortalId', macrosControllerMyntra.getFilesByBrandAndPortal);

// Get Myntra working file data by brandId, sellerPortalId and date
router.get('/working/:brandId/:sellerPortalId/:date', macrosControllerMyntra.getWorkingFileData);

// Get Myntra pivot data by brandId, sellerPortalId and date
router.get('/pivot/:brandId/:sellerPortalId/:date', macrosControllerMyntra.getPivotData);

// Get Myntra after-pivot data by brandId, sellerPortalId and date
router.get('/after-pivot/:brandId/:sellerPortalId/:date', macrosControllerMyntra.getAfterPivotData);

// Download combined Myntra file
router.get('/download/combined/:id', macrosControllerMyntra.downloadCombined);

// Delete Myntra macros file
router.delete('/files/:id', macrosControllerMyntra.deleteMacrosFile);

module.exports = router;
