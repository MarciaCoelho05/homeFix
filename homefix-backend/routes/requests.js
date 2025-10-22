const express = require('express');
const router = express.Router();
const requests = require('../controllers/requests');
const auth = require('../middlewares/auth');

router.post('/', auth, requests.createRequest);
router.get('/mine', auth, requests.getUserRequests);
router.get('/', auth, requests.getAllRequests);

module.exports = router;