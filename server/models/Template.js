import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a template title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add a template description'],
    },
    price: {
      type: Number,
      required: [true, 'Please add a template price'],
      default: 0,
    },
    type: {
      type: String,
      enum: ['image', 'video'],
      default: 'image',
    },
    previewUrl: {
      type: String,
      required: [true, 'Please add a preview image URL'],
    },
    fileUrl: {
      type: String,
      default: '',
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Please specify a category'],
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
    },
    config: {
      canvasWidth: { type: Number, default: 1080 },
      canvasHeight: { type: Number, default: 1080 },
      layers: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
      }
    }
  },
  {
    timestamps: true,
  }
);

const Template = mongoose.model('Template', templateSchema);
export default Template;
