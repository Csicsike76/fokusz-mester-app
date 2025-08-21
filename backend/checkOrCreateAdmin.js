// createAdmin.js
// Node.js script az admin felhasználó létrehozásához

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js'; // Feltételezzük, hogy van User modell

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fokusz-mester-backend';

const createAdmin = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Kapcsolódva a MongoDB-hez');

    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Már létezik admin felhasználó:', existingAdmin.email);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('19Kisolahen76?', 10);

    const admin = new User({
      username: 'admin',
      email: '19perro76@gmail.com',
      password: hashedPassword,
      role: 'admin',
      isAuthenticated: true, // ha kell az authhoz
    });

    await admin.save();
    console.log('Admin felhasználó sikeresen létrehozva!');
    process.exit(0);
  } catch (error) {
    console.error('Hiba az admin létrehozásakor:', error);
    process.exit(1);
  }
};

createAdmin();
