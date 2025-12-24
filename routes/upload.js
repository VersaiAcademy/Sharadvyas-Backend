const express = require('express');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const auth = require('../middleware/auth');

const router = express.Router();

// Multer configuration for DSLR images
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB per file
    files: 10 // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    // Accept common DSLR image formats
    const allowedTypes = /jpeg|jpg|png|webp|heic/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      return cb(new Error('Invalid file type. Only images (jpg, jpeg, png, webp, heic) are allowed.'));
    }
  }
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

// Upload photo with explicit error handling
router.post('/photo', auth, (req, res) => {
  upload.array('files', 10)(req, res, async (err) => {
    // Handle Multer errors explicitly
    if (err) {
      console.error('Multer error:', err);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 25MB per file.' });
      }
      
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Too many files. Maximum 10 files allowed.' });
      }
      
      if (err.message.includes('Invalid file type')) {
        return res.status(415).json({ error: err.message });
      }
      
      // Generic multer error
      return res.status(400).json({ error: 'Upload error: ' + err.message });
    }

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

      const uploadPromises = req.files.map(file => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'photos',
              resource_type: 'auto',
              // Optimize for DSLR images - maintain quality
              quality: 'auto',
              format: 'auto'
            },
            (error, result) => {
              if (error) {
                console.error('Cloudinary upload error:', error);
                reject(error);
              } else {
                resolve({
                  url: result.secure_url,
                  publicId: result.public_id,
                  width: result.width,
                  height: result.height,
                  thumbnail: cloudinary.url(result.public_id, { width: 300, height: 300, crop: 'fill' }),
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
      console.error('Upload processing error:', error);
      res.status(500).json({ error: 'Internal server error during upload processing' });
    }
  });
});


module.exports = router;