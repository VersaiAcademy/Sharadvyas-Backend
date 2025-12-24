const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const auth = require('../middleware/auth');
const Photo = require('../models/Photo');

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

      const uploadPromises = req.files.map(async (file, index) => {
        console.log(`Processing file ${index + 1}: ${file.originalname} (${file.size} bytes)`);
        
        // Generate hash from file buffer
        const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');
        console.log(`Generated hash for file ${index + 1}: ${hash.substring(0, 16)}...`);
        
        // Check if photo with this hash already exists
        const existingPhoto = await Photo.findOne({ hash });
        if (existingPhoto) {
          console.log(`Duplicate found for file ${index + 1}, reusing existing photo: ${existingPhoto._id}`);
          return {
            url: existingPhoto.cloudinary_url,
            publicId: existingPhoto.cloudinary_public_id,
            width: existingPhoto.width,
            height: existingPhoto.height,
            thumbnail: existingPhoto.thumbnail_url,
            hash,
            reused: true
          };
        }
        
        // Validate file buffer
        if (!file.buffer || file.buffer.length === 0) {
          throw new Error(`Invalid file buffer for ${file.originalname}`);
        }
        
        // Upload to Cloudinary
        return new Promise((resolve, reject) => {
          console.log(`Starting Cloudinary upload for file ${index + 1}`);
          
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'photos',
              resource_type: 'image',
              quality: 'auto',
              timeout: 60000
            },
            (error, result) => {
              if (error) {
                console.error(`Cloudinary upload error for file ${index + 1}:`, error);
                reject(new Error(`Upload failed for ${file.originalname}: ${error.message}`));
              } else {
                console.log(`Successfully uploaded file ${index + 1}: ${result.public_id}`);
                resolve({
                  url: result.secure_url,
                  publicId: result.public_id,
                  width: result.width,
                  height: result.height,
                  thumbnail: cloudinary.url(result.public_id, { width: 300, height: 300, crop: 'fill' }),
                  hash,
                  reused: false
                });
              }
            }
          );
          
          stream.on('error', (streamError) => {
            console.error(`Stream error for file ${index + 1}:`, streamError);
            reject(new Error(`Stream error for ${file.originalname}: ${streamError.message}`));
          });
          
          stream.end(file.buffer);
        });
      });

      console.log(`Processing ${uploadPromises.length} files...`);
      
      // Process uploads sequentially to avoid overwhelming Cloudinary
      const results = [];
      for (let i = 0; i < uploadPromises.length; i++) {
        try {
          const result = await uploadPromises[i];
          results.push(result);
          console.log(`File ${i + 1} processed successfully`);
        } catch (error) {
          console.error(`File ${i + 1} processing failed:`, error);
          results.push({ error: error.message, fileIndex: i + 1 });
        }
      }
      
      // Separate successful and failed uploads
      const successful = results.filter(r => !r.error);
      const failed = results.filter(r => r.error);
      
      if (successful.length === 0) {
        return res.status(500).json({ error: 'All uploads failed: ' + failed.map(f => f.error).join('; ') });
      }
      
      // Return successful uploads, log failures
      if (failed.length > 0) {
        console.warn('Partial upload failure:', failed);
      }
      
      console.log(`${successful.length} files processed successfully`);
      res.json(successful);
    } catch (error) {
      console.error('Upload processing error:', error);
      res.status(500).json({ error: 'Internal server error during upload processing' });
    }
  });
});


module.exports = router;