const express = require('express');
const multer = require('multer');
const router = express.Router();
const macrosControllerFirstCry = require('../controllers/macrosControllerFirstCry');

// Configure multer for file uploads (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Generate FirstCry macros (upload raw file)
router.post('/generate', upload.fields([{ name: 'rawFile', maxCount: 1 }]), macrosControllerFirstCry.generateMacros);

// Get files by brandId and sellerPortalId
router.get('/files/:brandId/:sellerPortalId', macrosControllerFirstCry.getFilesByBrandAndPortal);

// Download combined FirstCry file
router.get('/download/combined/:id', macrosControllerFirstCry.downloadCombined);

// Delete FirstCry macros file
router.delete('/files/:id', macrosControllerFirstCry.deleteMacrosFile);

module.exports = router;
