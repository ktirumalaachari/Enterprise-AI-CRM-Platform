/**
 * Cloudinary Service — handles avatar upload, delete, and URL generation.
 * Initialized lazily so missing credentials don't crash the server at startup.
 */
import { v2 as cloudinary } from 'cloudinary';

let _configured = false;

function ensureConfigured(): boolean {
  if (_configured) return true;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn(
      '[CloudinaryService] CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET ' +
      'are not set. Avatar uploads will be stored as data URIs instead.'
    );
    return false;
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  _configured = true;
  return true;
}

/**
 * Upload a Buffer to Cloudinary under the avatars/crm folder.
 * Returns the secure URL and public_id, or throws on failure.
 */
export async function uploadAvatarToCloudinary(
  buffer: Buffer,
  userId: string
): Promise<{ url: string; publicId: string }> {
  if (!ensureConfigured()) {
    throw new Error('Cloudinary is not configured. Please set environment variables.');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'aicrm/avatars',
        public_id: `avatar_${userId}_${Date.now()}`,
        resource_type: 'image',
        overwrite: true,
        transformation: [
          { width: 512, height: 512, crop: 'fill', gravity: 'face' },
          { quality: 'auto:good', fetch_format: 'webp' },
        ],
      },
      (error, result) => {
        if (error || !result) {
          console.error('[CloudinaryService] Upload failed:', error);
          return reject(new Error(error?.message || 'Cloudinary upload failed'));
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    uploadStream.end(buffer);
  });
}

/**
 * Delete an asset from Cloudinary by its public_id.
 * Silently logs errors — never throws (deletion failure must not block auth or profile load).
 */
export async function deleteAvatarFromCloudinary(publicId: string): Promise<void> {
  if (!ensureConfigured() || !publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (err: any) {
    console.error('[CloudinaryService] Failed to delete avatar:', err.message);
  }
}

/**
 * Extract a Cloudinary public_id from a secure URL.
 * e.g. https://res.cloudinary.com/demo/image/upload/v123/aicrm/avatars/avatar_xxx.webp
 *   → aicrm/avatars/avatar_xxx
 */
export function extractPublicId(url: string): string | null {
  try {
    // Match the path segment after /upload/v<version>/
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export const isCloudinaryConfigured = () => ensureConfigured();
