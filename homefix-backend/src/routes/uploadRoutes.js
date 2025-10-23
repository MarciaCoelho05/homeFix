const express = require('express');
const multer = require('multer');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { protect } = require('../middlewares/authMiddleware');

const upload = multer({ dest: 'uploads/' });
const router = express.Router();

router.post('/', protect, upload.single('file'), async (req, res) => {
  const filePath = req.file.path;
  const result = await uploadToCloudinary(filePath);
  res.json({ url: result.secure_url });
});

module.exports = router;
