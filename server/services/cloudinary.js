import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import 'dotenv/config';

const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Memory-safe streaming upload directly to Cloudinary
 * @param {Buffer} buffer - File buffer from multer
 * @param {string} mimeType - MIME type of the file
 * @param {string} folder - Destination folder in Cloudinary
 * @returns {Promise<{ url: string, public_id: string, bytes: number, format: string }>}
 */
export async function uploadImageBufferToCloudinary(buffer, mimeType, folder = 'codeclever_uploads') {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Invalid file buffer.');
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error('File size exceeds the 5MB maximum limit.');
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType?.toLowerCase())) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
  }

  if (!isCloudinaryConfigured) {
    console.warn('[Cloudinary] Credentials not set in environment. Falling back to data URI preview in development.');
    const base64 = buffer.toString('base64');
    return {
      url: `data:${mimeType};base64,${base64}`,
      public_id: 'dev_mock_' + Date.now(),
      bytes: buffer.length,
      format: mimeType.split('/')[1] || 'jpeg'
    };
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
          { width: 1200, crop: 'limit' }
        ]
      },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary Stream Upload Error]:', error);
          return reject(new Error('Cloudinary upload failed: ' + (error.message || 'Unknown error')));
        }
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          bytes: result.bytes,
          format: result.format
        });
      }
    );

    // Stream buffer into Cloudinary and release memory
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
}

export { cloudinary, isCloudinaryConfigured };
