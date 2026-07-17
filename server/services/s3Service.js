import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const isAWSConfigured = () => {
  return (
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_BUCKET_NAME
  );
};

let s3Client = null;
if (isAWSConfigured()) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  console.log('AWS S3 Integration Initialized');
} else {
  console.log('AWS S3 credentials not found. Falling back to local storage.');
}

export const uploadFileToStorage = async (file) => {
  if (!file) return '';

  const filename = `${Date.now()}_${path.basename(file.originalname).replace(/\s+/g, '_')}`;

  if (isAWSConfigured()) {
    try {
      const fileStream = fs.createReadStream(file.path);
      const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: filename,
        Body: fileStream,
        ContentType: file.mimetype,
      };

      await s3Client.send(new PutObjectCommand(uploadParams));

      // Delete the local file since it's uploaded to S3
      fs.unlink(file.path, (err) => {
        if (err) console.error(`Error deleting local temp file: ${err}`);
      });

      return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${filename}`;
    } catch (error) {
      console.error('Error uploading file to AWS S3, using local fallback:', error);
      return `/uploads/${file.filename}`;
    }
  } else {
    return `/uploads/${file.filename}`;
  }
};

export const deleteFileFromStorage = async (fileUrl) => {
  if (!fileUrl) return;

  if (isAWSConfigured() && fileUrl.includes('.amazonaws.com/')) {
    try {
      const urlParts = fileUrl.split('.amazonaws.com/');
      if (urlParts.length > 1) {
        const key = urlParts[1];
        console.log(`[Storage] Attempting to delete S3 object: ${key}`);
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
          })
        );
        console.log(`[Storage] Deleted S3 object successfully: ${key}`);
      }
    } catch (error) {
      console.error('[Storage] Error deleting file from S3:', error);
    }
  } else {
    try {
      let filename = '';
      if (fileUrl.includes('/uploads/')) {
        filename = fileUrl.split('/uploads/')[1];
      } else {
        filename = path.basename(fileUrl);
      }
      
      const filePath = path.join(process.cwd(), 'uploads', filename);
      if (fs.existsSync(filePath)) {
        console.log(`[Storage] Attempting to delete local file: ${filePath}`);
        fs.unlinkSync(filePath);
        console.log(`[Storage] Deleted local file successfully: ${filePath}`);
      }
    } catch (error) {
      console.error('[Storage] Error deleting local file:', error);
    }
  }
};
