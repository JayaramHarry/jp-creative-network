import mongoose from 'mongoose';

let mongoServer = null;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/memoriastudio',
      { serverSelectionTimeoutMS: 2000 }
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // In production, don't fall back to in-memory — require a real database
    if (process.env.NODE_ENV === 'production') {
      console.error(`MongoDB connection failed: ${error.message}`);
      console.error('Please check your MONGO_URI environment variable and MongoDB Atlas network access.');
      process.exit(1);
    }

    // In development, try in-memory fallback
    console.log(`Database connection refused. Launching in-memory MongoDB server...`);
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      const conn = await mongoose.connect(mongoUri);
      console.log(`MongoDB Connected (In-Memory Server): ${conn.connection.host}`);
    } catch (dbErr) {
      console.error(`Error starting in-memory DB: ${dbErr.message}`);
      process.exit(1);
    }
  }
};

export default connectDB;

