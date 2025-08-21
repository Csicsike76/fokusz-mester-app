// src/backend/approveMyTeacher.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || '<ide_jön_az_URI>';

const userEmail = '19perro76@gmail.com'; // a te email-ed

// User modell
const userSchema = new mongoose.Schema({
    email: String,
    role: String,
    approved: Boolean,
});

const User = mongoose.model('User', userSchema);

async function approveTeacher() {
    try {
        await mongoose.connect(MONGO_URI);
        const result = await User.findOneAndUpdate(
            { email: userEmail, role: 'teacher' },
            { approved: true },
            { new: true }
        );
        if (result) {
            console.log(`Sikeresen jóváhagyva: ${result.email}`);
        } else {
            console.log('Nem találtunk tanári fiókot ezzel az email-címmel.');
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error('Hiba történt:', err);
    }
}

approveTeacher();
