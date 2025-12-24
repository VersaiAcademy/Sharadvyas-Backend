const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  tags: [{ type: String }],
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  cloudinary_url: { type: String, required: true },
  thumbnail_url: { type: String, required: true },
  cloudinary_public_id: { type: String, required: true },
  width: { type: Number, default: 0 },
  height: { type: Number, default: 0 },
  downloads: { type: Number, default: 0 },
  hash: { type: String, default: null }, // Auto-generated, not required
}, { timestamps: true });

// Transform _id to id when converting to JSON
photoSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Photo', photoSchema);