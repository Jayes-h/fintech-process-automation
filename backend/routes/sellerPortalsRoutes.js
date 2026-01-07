const express = require('express');
const router = express.Router();
const sellerPortalsController = require('../controllers/sellerPortalsController');

// Get all seller portals
router.get('/', sellerPortalsController.getAllSellerPortals);

// Get seller portal by ID
router.get('/:id', sellerPortalsController.getSellerPortalById);

// Create new seller portal
router.post('/', sellerPortalsController.createSellerPortal);

// Update seller portal
router.put('/:id', sellerPortalsController.updateSellerPortal);

// Delete seller portal
router.delete('/:id', sellerPortalsController.deleteSellerPortal);

module.exports = router;









