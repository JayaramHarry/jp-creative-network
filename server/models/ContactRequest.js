import mongoose from 'mongoose';

const contactRequestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    subject: {
      type: String,
      required: [true, 'Please add a subject'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Please add a message'],
    },
    phone: {
      type: String,
      default: '',
    },
    businessName: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'read', 'replied'],
      default: 'pending',
    }
  },
  {
    timestamps: true,
  }
);

const ContactRequest = mongoose.model('ContactRequest', contactRequestSchema);
export default ContactRequest;
