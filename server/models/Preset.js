import mongoose from 'mongoose';

const presetSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a preset name'],
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'Please add a preset asset URL'],
    },
    category: {
      type: String,
      required: [true, 'Please select a preset category'],
      enum: [
        'political',
        'ribbons',
        'nameplates',
        'stickers',
        'borders',
        'decorative',
        'birthday',
        'wedding',
        'business',
        'social',
        'festival',
        'badges',
        'labels',
      ],
    },
    tags: {
      type: [String],
      default: [],
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Preset = mongoose.model('Preset', presetSchema);
export default Preset;
