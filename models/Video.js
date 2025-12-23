const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  youtube_url: { type: String, required: true },
  category: { type: String, default: '' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Video', videoSchema);