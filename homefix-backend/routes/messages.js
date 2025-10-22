const express = require('express');
const router = express.Router();
const messages = require('../controllers/messages');
const auth = require('../middlewares/auth');

router.post('/', auth, messages.sendMessage);
router.get('/:requestId', auth, messages.getMessages);

module.exports = router;