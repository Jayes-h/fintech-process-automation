const express = require('express');
const router = express.Router();
const brandsController = require('../controllers/brandsController');

// Get all brands
router.get('/', brandsController.getAllBrands);

// Get brand by ID
router.get('/:id', brandsController.getBrandById);

// Create new brand
router.post('/', brandsController.createBrand);

// Update brand
router.put('/:id', brandsController.updateBrand);

// Delete brand
router.delete('/:id', brandsController.deleteBrand);

module.exports = router;



