import mongoose from 'mongoose';

const customDesignRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
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
    phone: {
      type: String,
      required: [true, 'Please add a contact phone number'],
    },
    requirementsDescription: {
      type: String,
      required: [true, 'Please add detailed requirements description'],
    },
    referenceImage: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending',
    }
  },
  {
    timestamps: true,
  }
);

const CustomDesignRequest = mongoose.model('CustomDesignRequest', customDesignRequestSchema);
export default CustomDesignRequest;
