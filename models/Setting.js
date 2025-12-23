const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  youtube_links: [{ type: String }],
  instagram_link: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);