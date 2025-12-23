const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  youtube_url: { type: String, required: true },
  category: { type: String, default: '' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Transform _id to id when converting to JSON
videoSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Video', videoSchema);