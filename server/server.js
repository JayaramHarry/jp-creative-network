import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';

// Route files
import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import presetRoutes from './routes/presetRoutes.js';

// Models for seed/admin endpoints
import Category from './models/Category.js';
import Template from './models/Template.js';
import Service from './models/Service.js';
import Order from './models/Order.js';
import User from './models/User.js';

import { protect, admin } from './middlewares/authMiddleware.js';
import { verifyPythonDependencies } from './services/backgroundRemovalService.js';

// Connect to database
await connectDB();

// Auto-seed default administrator if the database is completely empty
try {
  const userCount = await User.countDocuments({});
  if (userCount === 0) {
    const adminEmail = process.env.ADMIN_EMAIL || 'jayaprakashnetha1@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'JPCreativeAdmin2026#';
    console.log(`Database empty. Automatically seeding default administrator account: ${adminEmail}...`);
    await User.create({
      name: 'admin',
      email: adminEmail.toLowerCase().trim(),
      password: adminPassword,
      role: 'admin',
      isEmailVerified: true,
    });
    console.log(`Successfully seeded default administrator (${adminEmail})`);
  }
} catch (err) {
  console.error('Auto-seed check failed:', err.message);
}

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/presets', presetRoutes);

app.get('/api/admin/stats', protect, admin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalTemplates = await Template.countDocuments({});
    const totalOrders = await Order.countDocuments({});
    
    const paidOrders = await Order.find({ status: 'paid' });
    const totalRevenue = paidOrders.reduce((sum, order) => sum + order.amount, 0);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalTemplates,
        totalOrders,
        totalRevenue,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/admin/users', protect, admin, async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/admin/users/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot delete an administrator account' });
    }

    await user.deleteOne();
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/seed', async (req, res) => {
  try {
    // Clean up duplicate categories
    const categoriesList = await Category.find({});
    const seenCategories = new Map();
    for (const cat of categoriesList) {
      const key = cat.name.toLowerCase().trim();
      if (seenCategories.has(key)) {
        await Category.findByIdAndDelete(cat._id);
      } else {
        seenCategories.set(key, cat._id);
      }
    }

    // Clean up duplicate services
    const servicesList = await Service.find({});
    const seenServices = new Map();
    for (const svc of servicesList) {
      const key = svc.title.toLowerCase().trim();
      if (seenServices.has(key)) {
        await Service.findByIdAndDelete(svc._id);
      } else {
        seenServices.set(key, svc._id);
      }
    }

    // Clean up duplicate templates
    const templatesList = await Template.find({});
    const seenTemplates = new Map();
    for (const tpl of templatesList) {
      const key = tpl.title.toLowerCase().trim();
      if (seenTemplates.has(key)) {
        await Template.findByIdAndDelete(tpl._id);
      } else {
        seenTemplates.set(key, tpl._id);
      }
    }

    // Seed default administrator if specified or default to jayaprakashnetha1@gmail.com
    const adminEmail = (process.env.ADMIN_EMAIL || 'jayaprakashnetha1@gmail.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'JPCreativeAdmin2026#';
    
    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      await User.create({
        name: 'admin',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        isEmailVerified: true,
      });
      console.log(`Seeded administrator (${adminEmail}) successfully`);
    } else {
      if (adminUser.role !== 'admin' || !adminUser.isEmailVerified) {
        adminUser.role = 'admin';
        adminUser.isEmailVerified = true;
        await adminUser.save();
        console.log(`Updated administrator (${adminEmail}) status successfully`);
      }
    }

    const categoriesCount = await Category.countDocuments({});
    let seededCategories = [];
    if (categoriesCount === 0) {
      const defaultCategories = [
        { name: 'Political', description: 'Design cards for Indian political campaigns and parties' },
        { name: 'Birthday', description: 'Premium birthday wishes templates and invitation cards' },
        { name: 'Anniversary', description: 'Wedding anniversary congratulations and celebration templates' },
        { name: 'Wedding', description: 'Beautiful wedding cards and video templates' },
        { name: 'Festival', description: 'National and regional Indian festival greeting cards' },
        { name: 'Business', description: 'Corporate cards, visual banners, and promotion templates' },
        { name: 'Photo Frames', description: 'Custom styled frames to overlay your photos' },
      ];
      seededCategories = [];
      for (const cat of defaultCategories) {
        const newCat = new Category(cat);
        await newCat.save();
        seededCategories.push(newCat);
      }
      console.log('Seeded Categories successfully');
    } else {
      seededCategories = await Category.find({});
    }

    // Upsert default and new services
    const defaultServices = [
      { title: 'Political Social Media Management', description: 'Complete monthly campaigns, post scheduling, and custom graphics management for political aspirants.', price: '₹25,000 / month' },
      { title: 'Fan Page Management', description: 'Optimized audience growth and engagement management for artist, leader, or influencer fan club profiles.', price: '₹12,000 / month' },
      { title: 'Instagram Page Maintenance', description: 'Creative grid layouts, daily stories, video reels editing, and direct messaging support.', price: '₹15,000 / month' },
      { title: 'Social Media Management', description: 'Facebook, Twitter, LinkedIn, and YouTube professional branding and design packages.', price: '₹20,000 / month' },
      { title: 'Photo Frame Design Services', description: 'Tailor-made digital or printable frames for family functions, political support, or events.', price: '₹2,500 per design' },
      { title: 'Business Development Services', description: 'Logo creation, brand manuals, and corporate brochures to establish visual identity.', price: '₹8,000 one-time' },
      { title: 'Custom Design Services', description: 'Direct consultations with our premium visual designers for customized vector template creations.', price: '₹5,000 onwards' },
      
      // 7 new services requested by the user
      { title: 'Photo Editing Services', description: 'Professional background removal, retouching, color enhancement, and graphic composition.', price: '₹500 / design' },
      { title: 'Video Editing Services', description: 'Cinematic cuts, color grading, sound design, and text animations for premium video content.', price: '₹3,000 / video' },
      { title: 'AI Video Editing Services', description: 'Futuristic AI video creation, deepfakes/avatars generation, and high-tech visualization.', price: '₹5,000 / video' },
      { title: 'Social Media Marketing', description: 'Promotional strategies, growth campaigns, daily engagement, and targeted paid ads setup.', price: '₹15,000 / month' },
      { title: 'Digital Marketing', description: 'Full-funnel digital presence optimization, SEO keyword rankings, Google Ads, and analytics.', price: '₹25,000 / month' },
      { title: 'Political Marketing', description: 'Voter demographic targeting, speech highlights editing, party branding, and whatsapp push campaigns.', price: '₹40,000 / month' },
      { title: 'Sales Marketing', description: 'Conversion rate optimization, lead generation ads, sales funnel copies, and product highlights.', price: '₹20,000 / month' }
    ];

    for (const service of defaultServices) {
      await Service.updateOne(
        { title: service.title },
        { $set: service },
        { upsert: true }
      );
    }
    console.log('Upserted Services successfully');

    const polCat = seededCategories.find(c => c.name === 'Political');
    const bdayCat = seededCategories.find(c => c.name === 'Birthday');
    const festivalCat = seededCategories.find(c => c.name === 'Festival');
    const photoCat = seededCategories.find(c => c.name === 'Photo Frames');

    const defaultTemplates = [];

    if (polCat) {
      defaultTemplates.push(
        {
          title: 'BJP Victory Poster',
          description: 'Support the BJP campaign with this bold saffron design containing space for local leaders.',
          price: 199,
          type: 'image',
          previewUrl: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?q=80&w=600&auto=format&fit=crop',
          fileUrl: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?q=80&w=1920&auto=format&fit=crop',
          category: polCat._id,
          isFeatured: true,
          isPopular: true,
          tags: ['bjp', 'political'],
          config: {
            photoBox: { x: 30, y: 300, width: 200, height: 250 },
            texts: [
              { id: 'name', label: 'Leader Name', x: 260, y: 350, fontSize: 32, color: '#FF9F1C', fontFamily: 'sans-serif', fontWeight: 'bold', align: 'left', defaultValue: 'Rahul Sharma' },
              { id: 'designation', label: 'Designation', x: 260, y: 395, fontSize: 20, color: '#FFFFFF', fontFamily: 'sans-serif', fontWeight: 'normal', align: 'left', defaultValue: 'Ward President' },
              { id: 'message', label: 'Campaign slogan', x: 260, y: 450, fontSize: 24, color: '#FFD700', fontFamily: 'sans-serif', fontWeight: 'bold', align: 'left', defaultValue: 'Development for All!' }
            ]
          }
        },
        {
          title: 'Congress Public Greeting Card',
          description: 'A professional political poster for general wishes and announcements with tricolor aesthetics.',
          price: 149,
          type: 'image',
          previewUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=600&auto=format&fit=crop',
          fileUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=1920&auto=format&fit=crop',
          category: polCat._id,
          isFeatured: false,
          isPopular: true,
          tags: ['congress', 'political'],
          config: {
            photoBox: { x: 50, y: 320, width: 180, height: 220 },
            texts: [
              { id: 'name', label: 'Leader Name', x: 250, y: 360, fontSize: 30, color: '#00A896', fontFamily: 'sans-serif', fontWeight: 'bold', align: 'left', defaultValue: 'Rajesh Patil' },
              { id: 'designation', label: 'Designation', x: 250, y: 400, fontSize: 18, color: '#FFFFFF', fontFamily: 'sans-serif', fontWeight: 'normal', align: 'left', defaultValue: 'State Secretary' },
              { id: 'message', label: 'Wishes Msg', x: 250, y: 460, fontSize: 22, color: '#FFFFFF', fontFamily: 'sans-serif', fontWeight: 'normal', align: 'left', defaultValue: 'Greetings to everyone on this day!' }
            ]
          }
        }
      );
    }

    if (bdayCat) {
      defaultTemplates.push(
        {
          title: 'Golden Birthday Wishes',
          description: 'Elegant golden theme birthday card with smooth dark background and neon light textures.',
          price: 299,
          type: 'image',
          previewUrl: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=600&auto=format&fit=crop',
          fileUrl: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=1920&auto=format&fit=crop',
          category: bdayCat._id,
          isFeatured: true,
          isPopular: false,
          tags: ['birthday', 'personal'],
          config: {
            photoBox: { x: 200, y: 100, width: 200, height: 200 },
            texts: [
              { id: 'name', label: 'Birthday Person', x: 300, y: 350, fontSize: 36, color: '#FFD700', fontFamily: 'sans-serif', fontWeight: 'bold', align: 'center', defaultValue: 'Aman Singhania' },
              { id: 'date', label: 'Birth Date', x: 300, y: 400, fontSize: 22, color: '#FFFFFF', fontFamily: 'sans-serif', fontWeight: 'normal', align: 'center', defaultValue: '12th June' },
              { id: 'message', label: 'Birthday Message', x: 300, y: 450, fontSize: 18, color: '#E0E0E0', fontFamily: 'sans-serif', fontWeight: 'normal', align: 'center', defaultValue: 'Wishing you a year filled with love, laughter, and success!' }
            ]
          }
        }
      );
    }

    if (festivalCat) {
      defaultTemplates.push(
        {
          title: 'Diwali Prosperity Card',
          description: 'Vibrant card decorated with diyas and rangoli designs, perfect for corporate and family greetings.',
          price: 99,
          type: 'image',
          previewUrl: 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?q=80&w=600&auto=format&fit=crop',
          fileUrl: 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?q=80&w=1920&auto=format&fit=crop',
          category: festivalCat._id,
          isFeatured: false,
          isPopular: true,
          tags: ['festival', 'hindu', 'diwali'],
          config: {
            photoBox: { x: 50, y: 300, width: 150, height: 150 },
            texts: [
              { id: 'name', label: 'Sender Name', x: 230, y: 340, fontSize: 26, color: '#FF9F1C', fontFamily: 'sans-serif', fontWeight: 'bold', align: 'left', defaultValue: 'Manoj Kumar' },
              { id: 'message', label: 'Diwali wishes', x: 230, y: 390, fontSize: 18, color: '#FFFFFF', fontFamily: 'sans-serif', fontWeight: 'normal', align: 'left', defaultValue: 'May the light of Diwali bring happiness, peace, and prosperity to your home.' }
            ]
          }
        },
        {
          title: 'Eid Mubarak Greeting',
          description: 'A beautiful Eid Mubarak card wishing peace and joy to your friends and family.',
          price: 149,
          type: 'image',
          previewUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=600&auto=format&fit=crop',
          fileUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=1920&auto=format&fit=crop',
          category: festivalCat._id,
          isFeatured: true,
          isPopular: false,
          tags: ['festival', 'muslim', 'eid'],
          config: {
            photoBox: { x: 50, y: 300, width: 150, height: 150 },
            texts: [
              { id: 'name', label: 'Sender Name', x: 230, y: 340, fontSize: 26, color: '#00A896', fontFamily: 'sans-serif', fontWeight: 'bold', align: 'left', defaultValue: 'Harish Sharma' },
              { id: 'message', label: 'Eid wishes', x: 230, y: 390, fontSize: 18, color: '#FFFFFF', fontFamily: 'sans-serif', fontWeight: 'normal', align: 'left', defaultValue: 'May this blessed Eid bring peace, happiness, and prosperity.' }
            ]
          }
        },
        {
          title: 'Merry Christmas Card',
          description: 'Elegant holiday wishes greeting card for Christmas and New Year celebrations.',
          price: 199,
          type: 'image',
          previewUrl: 'https://images.unsplash.com/photo-1543589077-47d81606c1bf?q=80&w=600&auto=format&fit=crop',
          fileUrl: 'https://images.unsplash.com/photo-1543589077-47d81606c1bf?q=80&w=1920&auto=format&fit=crop',
          category: festivalCat._id,
          isFeatured: false,
          isPopular: false,
          tags: ['festival', 'christian', 'christmas'],
          config: {
            photoBox: { x: 50, y: 300, width: 150, height: 150 },
            texts: [
              { id: 'name', label: 'Sender Name', x: 230, y: 340, fontSize: 26, color: '#FF0000', fontFamily: 'sans-serif', fontWeight: 'bold', align: 'left', defaultValue: 'Sairam Patil' },
              { id: 'message', label: 'Christmas wishes', x: 230, y: 390, fontSize: 18, color: '#FFFFFF', fontFamily: 'sans-serif', fontWeight: 'normal', align: 'left', defaultValue: 'Wishing you a Merry Christmas and a Happy New Year!' }
            ]
          }
        },
        {
          title: 'Independence Day Poster',
          description: 'Vibrant tricolor template for Indian Independence Day greetings and patriotic campaign cards.',
          price: 99,
          type: 'image',
          previewUrl: 'https://images.unsplash.com/photo-1532375810709-75b1da00537c?q=80&w=600&auto=format&fit=crop',
          fileUrl: 'https://images.unsplash.com/photo-1532375810709-75b1da00537c?q=80&w=1920&auto=format&fit=crop',
          category: festivalCat._id,
          isFeatured: false,
          isPopular: false,
          tags: ['festival', 'national', 'independence'],
          config: {
            photoBox: { x: 50, y: 300, width: 150, height: 150 },
            texts: [
              { id: 'name', label: 'Sender Name', x: 230, y: 340, fontSize: 26, color: '#FF9F1C', fontFamily: 'sans-serif', fontWeight: 'bold', align: 'left', defaultValue: 'Manoj Kumar' },
              { id: 'message', label: 'Patriotic wishes', x: 230, y: 390, fontSize: 18, color: '#FFFFFF', fontFamily: 'sans-serif', fontWeight: 'normal', align: 'left', defaultValue: 'Proud to be an Indian. Happy Independence Day!' }
            ]
          }
        },
        {
          title: 'Monsoon Seasonal Greeting',
          description: 'A beautiful seasonal card to celebrate the monsoon rains and seasonal wishes.',
          price: 129,
          type: 'image',
          previewUrl: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?q=80&w=600&auto=format&fit=crop',
          fileUrl: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?q=80&w=1920&auto=format&fit=crop',
          category: festivalCat._id,
          isFeatured: false,
          isPopular: false,
          tags: ['festival', 'seasonal', 'monsoon'],
          config: {
            photoBox: { x: 50, y: 300, width: 150, height: 150 },
            texts: [
              { id: 'name', label: 'Sender Name', x: 230, y: 340, fontSize: 26, color: '#00A896', fontFamily: 'sans-serif', fontWeight: 'bold', align: 'left', defaultValue: 'Harish Sharma' },
              { id: 'message', label: 'Seasonal wishes', x: 230, y: 390, fontSize: 18, color: '#FFFFFF', fontFamily: 'sans-serif', fontWeight: 'normal', align: 'left', defaultValue: 'Wishing you a happy and refreshing Monsoon season!' }
            ]
          }
        }
      );
    }

    if (photoCat) {
      defaultTemplates.push(
        {
          title: 'Classic Vintage Frame',
          description: 'Wooden vintage overlay texture with soft borders to outline your family portrait.',
          price: 199,
          type: 'image',
          previewUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=600&auto=format&fit=crop',
          fileUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1920&auto=format&fit=crop',
          category: photoCat._id,
          isFeatured: false,
          isPopular: false,
          tags: ['vintage', 'frame'],
          config: {
            photoBox: { x: 50, y: 50, width: 500, height: 400 },
            texts: [
              { id: 'message', label: 'Frame Title', x: 300, y: 480, fontSize: 24, color: '#8B4513', fontFamily: 'sans-serif', fontWeight: 'bold', align: 'center', defaultValue: 'Family Memories' }
            ]
          }
        }
      );
    }

    for (const temp of defaultTemplates) {
      await Template.updateOne(
        { title: temp.title },
        { $set: temp },
        { upsert: true }
      );
    }
    console.log('Upserted Templates successfully');

    res.json({
      success: true,
      message: 'Database pre-populated/updated with categories, default services, and visual templates!'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  // Verify Python dependencies for AI background removal (non-blocking)
  await verifyPythonDependencies();
});
