const express = require('express');
const Video = require('../models/Video');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all videos
router.get('/', async (req, res) => {
  try {
    const videos = await Video.find().sort('-createdAt');
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create video
router.post('/', auth, async (req, res) => {
  try {
    const { title, youtube_url, category } = req.body;
    const video = new Video({ title, youtube_url, category });
    await video.save();
    res.json(video);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update video
router.put('/:id', auth, async (req, res) => {
  try {
    const video = await Video.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(video);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete video
router.delete('/:id', auth, async (req, res) => {
  try {
    await Video.findByIdAndDelete(req.params.id);
    res.json({ message: 'Video deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;