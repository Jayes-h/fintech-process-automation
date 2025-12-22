const express = require('express');
const router = express.Router();
const misDataController = require('../controllers/misDataController');

// Create new MIS data
router.post('/', misDataController.createMISData);

// Get all MIS data (with optional query filters: ?brand=...&agent_id=...&createdBy=...)
router.get('/', misDataController.getAllMISData);

// Get all unique brands
router.get('/brands', misDataController.getAllBrands);

// Get MIS format by brand (for reuse)
router.get('/format/brand/:brand', misDataController.getMISFormatByBrand);

// Get MIS data by brand
router.get('/brand/:brand', misDataController.getMISDataByBrand);

// Get MIS data by ID
router.get('/:id', misDataController.getMISDataById);

// Update MIS data
router.put('/:id', misDataController.updateMISData);

// Delete MIS data
router.delete('/:id', misDataController.deleteMISData);

module.exports = router;

