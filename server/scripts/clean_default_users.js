import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';

dotenv.config();

const cleanDefaultUsers = async () => {
  try {
    await connectDB();
    
    console.log('Deleting test accounts (admin@jpcreateworks.com and harry@jpcreateworks.com)...');
    const delAdmin = await User.deleteOne({ email: 'admin@jpcreateworks.com' });
    const delHarry = await User.deleteOne({ email: 'harry@jpcreateworks.com' });
    
    console.log(`Deleted admin@jpcreateworks.com: ${delAdmin.deletedCount}`);
    console.log(`Deleted harry@jpcreateworks.com: ${delHarry.deletedCount}`);
    
    const adminEmail = process.env.ADMIN_EMAIL || 'jayaprakashnetha1@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'JPCreativeAdmin2026#';
    
    console.log(`Ensuring custom administrator exists: ${adminEmail}...`);
    const existing = await User.findOne({ email: adminEmail.toLowerCase().trim() });
    if (!existing) {
      await User.create({
        name: 'admin',
        email: adminEmail.toLowerCase().trim(),
        password: adminPassword,
        role: 'admin',
        isEmailVerified: true
      });
      console.log(`Created custom administrator successfully!`);
    } else {
      existing.role = 'admin';
      existing.password = adminPassword;
      existing.isEmailVerified = true;
      await existing.save();
      console.log(`Updated custom administrator role and password successfully!`);
    }
    
    console.log('Operation completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error cleaning default users:', err.message);
    process.exit(1);
  }
};

cleanDefaultUsers();
