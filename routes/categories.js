const express = require('express');
const Category = require('../models/Category');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort('name');
    const transformedCategories = categories.map(category => ({
      id: category._id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      cover_image: category.cover_image,
      created_at: category.createdAt,
      updated_at: category.updatedAt,
    }));
    res.json(transformedCategories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create category
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, cover_image } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const category = new Category({ name, slug, description, cover_image });
    await category.save();
    const transformedCategory = {
      id: category._id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      cover_image: category.cover_image,
      created_at: category.createdAt,
      updated_at: category.updatedAt,
    };
    res.json(transformedCategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update category
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, cover_image } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name, slug, description, cover_image },
      { new: true }
    );
    const transformedCategory = {
      id: category._id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      cover_image: category.cover_image,
      created_at: category.createdAt,
      updated_at: category.updatedAt,
    };
    res.json(transformedCategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete category
router.delete('/:id', auth, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;