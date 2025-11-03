const { v2: cloudinary } = require('cloudinary');
const { Readable } = require('stream');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload de buffer (para Vercel/serverless) ou filePath (para desenvolvimento)
async function uploadToCloudinary(fileData, options = {}) {
  try {
    // Se for buffer (memory storage), usar stream upload
    if (Buffer.isBuffer(fileData)) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'homefix',
            resource_type: 'auto',
            public_id: options.filename ? options.filename.replace(/\.[^/.]+$/, '') : undefined,
            ...options
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );

        const stream = Readable.from(fileData);
        stream.pipe(uploadStream);
      });
    } 
    
    // Se for filePath (desenvolvimento local)
    const res = await cloudinary.uploader.upload(fileData, {
      folder: 'homefix',
      resource_type: 'auto'
    });
    return res;
  } catch (error) {
    console.error('Erro no upload para Cloudinary:', error);
    throw error;
  }
}

module.exports = { uploadToCloudinary };
