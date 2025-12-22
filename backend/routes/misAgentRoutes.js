const express = require('express');
const multer = require('multer');
const router = express.Router();
const misAgentController = require('../controllers/misAgentController');

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Upload Trial Balance file
router.post('/upload', upload.single('file'), misAgentController.uploadTrialBalance);

// List all MIS Agents (with optional brand filter)
router.get('/list', misAgentController.listMISAgents);

// Get formats by brand
router.get('/formats/brand/:brand', misAgentController.getFormatsByBrand);

// Get all saved formats
router.get('/formats/all', misAgentController.getAllFormats);

// Save format for reuse
router.post('/format/save', misAgentController.saveFormat);

// Save & Generate MIS (final action - saves everything to database)
// MUST be before /:agentId routes to avoid route conflicts
router.post('/save-and-generate', misAgentController.saveAndGenerateMIS);

// Get MIS Agent data
router.get('/:agentId', misAgentController.getMISAgent);

// Get particulars
router.get('/:agentId/particulars', misAgentController.getParticulars);

// Save MIS format
router.post('/:agentId/format', misAgentController.saveMISFormat);

// Generate MIS (for existing records)
router.post('/:agentId/generate', misAgentController.generateMIS);

// Download Excel
router.get('/:agentId/download', misAgentController.downloadExcel);

module.exports = router;

