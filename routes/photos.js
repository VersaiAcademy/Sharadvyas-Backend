const express = require('express');
const Photo = require('../models/Photo');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all photos
router.get('/', async (req, res) => {
  try {
    let query = Photo.find();

    if (req.query.category) {
      query = query.where('category_id').equals(req.query.category);
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query = query.or([
        { title: searchRegex },
        { tags: { $in: [searchRegex] } }
      ]);
    }

    const photos = await query.populate('category_id').sort('-createdAt');
    const transformedPhotos = photos.map(photo => ({
      id: photo._id,
      title: photo.title,
      description: photo.description,
      tags: photo.tags,
      category_id: photo.category_id?._id || null,
      category: photo.category_id ? {
        id: photo.category_id._id,
        name: photo.category_id.name,
        slug: photo.category_id.slug,
        description: photo.category_id.description,
      } : null,
      cloudinary_url: photo.cloudinary_url,
      thumbnail_url: photo.thumbnail_url,
      cloudinary_public_id: photo.cloudinary_public_id,
      width: photo.width,
      height: photo.height,
      downloads: photo.downloads,
      created_at: photo.createdAt,
      updated_at: photo.updatedAt,
    }));
    res.json(transformedPhotos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create photo
router.post('/', auth, async (req, res) => {
  try {
    const photo = new Photo(req.body);
    await photo.save();

    // Set category cover image if not set
    if (photo.category_id) {
      const Category = require('../models/Category');
      const category = await Category.findById(photo.category_id);
      if (category && !category.cover_image) {
        category.cover_image = photo.cloudinary_url;
        await category.save();
      }
    }

    const populatedPhoto = await Photo.findById(photo._id).populate('category_id');
    const transformedPhoto = {
      id: populatedPhoto._id,
      title: populatedPhoto.title,
      description: populatedPhoto.description,
      tags: populatedPhoto.tags,
      category_id: populatedPhoto.category_id?._id || null,
      category: populatedPhoto.category_id ? {
        id: populatedPhoto.category_id._id,
        name: populatedPhoto.category_id.name,
        slug: populatedPhoto.category_id.slug,
        description: populatedPhoto.category_id.description,
      } : null,
      cloudinary_url: populatedPhoto.cloudinary_url,
      thumbnail_url: populatedPhoto.thumbnail_url,
      cloudinary_public_id: populatedPhoto.cloudinary_public_id,
      width: populatedPhoto.width,
      height: populatedPhoto.height,
      downloads: populatedPhoto.downloads,
      created_at: populatedPhoto.createdAt,
      updated_at: populatedPhoto.updatedAt,
    };
    res.json(transformedPhoto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update photo
router.put('/:id', auth, async (req, res) => {
  try {
    const photo = await Photo.findByIdAndUpdate(req.params.id, req.body, { new: true });
    const populatedPhoto = await Photo.findById(photo._id).populate('category_id');
    const transformedPhoto = {
      id: populatedPhoto._id,
      title: populatedPhoto.title,
      description: populatedPhoto.description,
      tags: populatedPhoto.tags,
      category_id: populatedPhoto.category_id?._id || null,
      category: populatedPhoto.category_id ? {
        id: populatedPhoto.category_id._id,
        name: populatedPhoto.category_id.name,
        slug: populatedPhoto.category_id.slug,
        description: populatedPhoto.category_id.description,
      } : null,
      cloudinary_url: populatedPhoto.cloudinary_url,
      thumbnail_url: populatedPhoto.thumbnail_url,
      cloudinary_public_id: populatedPhoto.cloudinary_public_id,
      width: populatedPhoto.width,
      height: populatedPhoto.height,
      downloads: populatedPhoto.downloads,
      created_at: populatedPhoto.createdAt,
      updated_at: populatedPhoto.updatedAt,
    };
    res.json(transformedPhoto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete photo
router.delete('/:id', auth, async (req, res) => {
  try {
    await Photo.findByIdAndDelete(req.params.id);
    res.json({ message: 'Photo deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single photo
router.get('/:id', async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id).populate('category_id');
    res.json(photo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;