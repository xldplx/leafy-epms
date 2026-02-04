const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// defining the route
router.post('/login', authController.login);

module.exports = router;    