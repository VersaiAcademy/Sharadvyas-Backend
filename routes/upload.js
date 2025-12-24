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

      const uploadPromises = req.files.map((file, index) => {
        return new Promise((resolve, reject) => {
          console.log(`Starting upload for file ${index + 1}: ${file.originalname} (${file.size} bytes)`);
          
          // Validate file buffer
          if (!file.buffer || file.buffer.length === 0) {
            reject(new Error(`Invalid file buffer for ${file.originalname}`));
            return;
          }
          
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'photos',
              resource_type: 'image', // Explicitly set for images
              // Optimize for DSLR images - maintain quality
              quality: 'auto', // Safe optimization
              timeout: 60000 // 60 second timeout
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
                });
              }
            }
          );
          
          // Handle stream errors
          stream.on('error', (streamError) => {
            console.error(`Stream error for file ${index + 1}:`, streamError);
            reject(new Error(`Stream error for ${file.originalname}: ${streamError.message}`));
          });
          
          stream.end(file.buffer);
        });
      });

      console.log(`Starting upload for ${uploadPromises.length} files...`);
      
      // Use Promise.allSettled to handle partial failures
      const settledResults = await Promise.allSettled(uploadPromises);
      
      const results = [];
      const errors = [];
      
      settledResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`Upload failed for file ${index + 1}:`, result.reason);
          errors.push(`File ${index + 1}: ${result.reason.message}`);
        }
      });
      
      if (errors.length > 0) {
        if (results.length === 0) {
          // All failed
          return res.status(500).json({ error: 'All uploads failed: ' + errors.join('; ') });
        } else {
          // Some failed - still return successful ones but log errors
          console.warn('Partial upload failure:', errors);
          // For now, return successful ones - you might want to handle this differently
        }
      }
      
      console.log(`${results.length} files uploaded successfully`);
      res.json(results);
    } catch (error) {
      console.error('Upload processing error:', error);
      res.status(500).json({ error: 'Internal server error during upload processing' });
    }
  });
});


module.exports = router;