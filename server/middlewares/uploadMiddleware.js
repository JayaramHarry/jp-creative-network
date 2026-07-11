import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // Allow images, videos, audio tracks, and source archives/design files
  const filetypes = /jpeg|jpg|png|gif|svg|mp4|webm|mov|avi|zip|psd|ai|pdf|cdr|eps|mp3|wav|m4a/i;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  
  // Match standard mimetypes for media, zip, and octet-stream/binary
  const mimetypes = /image|video|audio|zip|octet-stream|pdf|postscript|photoshop|illustrator/i;
  const mimetype = mimetypes.test(file.mimetype);

  if (extname || mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only images, videos, audio (MP3, WAV, M4A), zip archives, and design source files (PSD, AI, PDF, EPS) are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
});

export default upload;
