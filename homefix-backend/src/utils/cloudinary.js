const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadToCloudinary(filePath) {
  try {
    const res = await cloudinary.uploader.upload(filePath, {
      folder: 'homefix',
      resource_type: 'auto'
    });
    return res;
  } finally {
    fs.existsSync(filePath) && fs.unlink(filePath, () => {});
  }
}

module.exports = { uploadToCloudinary };
