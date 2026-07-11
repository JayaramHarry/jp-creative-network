import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a service title'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: [true, 'Please add a service description'],
    },
    image: {
      type: String,
      default: '',
    },
    price: {
      type: String,
      default: 'Contact for pricing',
    }
  },
  {
    timestamps: true,
  }
);

const Service = mongoose.model('Service', serviceSchema);
export default Service;
