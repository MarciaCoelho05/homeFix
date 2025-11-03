const express = require('express');
const multer = require('multer');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { protect } = require('../middlewares/authMiddleware');

// Usar memory storage para Vercel (serverless - não pode escrever em disco)
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum ficheiro enviado' });
    }

    // Upload direto do buffer para Cloudinary (não precisa salvar em disco)
    const result = await uploadToCloudinary(req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    
    res.json({ url: result.secure_url });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ message: 'Erro ao fazer upload do ficheiro' });
  }
});

module.exports = router;
