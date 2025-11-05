const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const mailer = require('../config/email');

const router = express.Router();

router.post('/test', protect, async (req, res) => {
  const { to, subject = 'Teste HomeFix', text = 'Email de teste HomeFix', html } = req.body || {};
  if (!to) return res.status(400).json({ message: "Campo 'to' é obrigatório" });
  try {
    const info = await mailer.sendMail({ from: '"HomeFix" <no-reply@homefix.com>', to, subject, text, html });
    res.json({ ok: true, messageId: info.messageId, accepted: info.accepted });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
