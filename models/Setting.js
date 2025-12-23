const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  youtube_links: [{ type: String }],
  instagram_link: { type: String, default: '' },
}, { timestamps: true });

// Transform _id to id when converting to JSON
settingSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Setting', settingSchema);