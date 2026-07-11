import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer = null;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/memoriastudio',
      { serverSelectionTimeoutMS: 2000 }
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(`Database connection refused. Launching in-memory MongoDB server...`);
    try {
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
