const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');
const auth = require('../middleware/auth');
const Photo = require('../models/Photo');

const router = express.Router();

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Test Cloudinary connection
router.get('/test-cloudinary', async (req, res) => {
  try {
    // Configure Cloudinary here to ensure env vars are loaded
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const result = await cloudinary.api.ping();
    res.json({ status: 'Cloudinary connected', result });
  } catch (error) {
    console.error('Cloudinary test failed:', error);
    res.status(500).json({ error: 'Cloudinary connection failed', details: error.message });
  }
});

// Upload photo
router.post('/photo', auth, upload.array('files', 10), async (req, res) => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    console.log('Upload request received');
    console.log('Files:', req.files ? `${req.files.length} files` : 'missing');

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Check for duplicates
    const hashes = req.files.map(file => crypto.createHash('sha256').update(file.buffer).digest('hex'));
    const existingPhotos = await Photo.find({ hash: { $in: hashes } });
    if (existingPhotos.length > 0) {
      return res.status(400).json({ error: 'Duplicate images detected. Some images already exist.' });
    }

    const uploadPromises = req.files.map((file, index) => {
      const hash = hashes[index];
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'photos',
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
                thumbnail: cloudinary.url(result.public_id, { width: 300, height: 300, crop: 'fill' }),
                hash,
              });
            }
          }
        );
        stream.end(file.buffer);
      });
    });

    const results = await Promise.all(uploadPromises);

    res.json(results);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});


module.exports = router;