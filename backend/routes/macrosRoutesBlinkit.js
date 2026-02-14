const express = require('express');
const multer = require('multer');
const router = express.Router();
const macrosControllerBlinkit = require('../controllers/macrosControllerBlinkit');

// Configure multer for file uploads (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Generate Blinkit macros (upload raw file)
router.post('/generate', upload.fields([{ name: 'rawFile', maxCount: 1 }]), macrosControllerBlinkit.generateMacros);

// Get files by brandId and sellerPortalId
router.get('/files/:brandId/:sellerPortalId', macrosControllerBlinkit.getFilesByBrandAndPortal);

// Download combined Blinkit file
router.get('/download/combined/:id', macrosControllerBlinkit.downloadCombined);

// Delete Blinkit macros file
router.delete('/files/:id', macrosControllerBlinkit.deleteMacrosFile);

module.exports = router;
