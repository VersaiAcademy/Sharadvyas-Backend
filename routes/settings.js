const express = require('express');
const Setting = require('../models/Setting');
const auth = require('../middleware/auth');

const router = express.Router();

// Get settings
router.get('/', async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = new Setting();
      await setting.save();
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
router.put('/', auth, async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = new Setting();
    }
    Object.assign(setting, req.body);
    await setting.save();
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;