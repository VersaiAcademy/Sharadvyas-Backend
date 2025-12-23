const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Update existing admin or create new
    let admin = await Admin.findOne();
    if (admin) {
      admin.email = 'admin@photoplatform.com';
      admin.password = hashedPassword;
      await admin.save();
      console.log('Admin updated');
    } else {
      admin = new Admin({
        email: 'admin@photoplatform.com',
        password: hashedPassword,
        name: 'Admin User',
      });
      await admin.save();
      console.log('Admin created');
    }
    console.log('Email: admin@photoplatform.com');
    console.log('Password: admin123');

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

seed();