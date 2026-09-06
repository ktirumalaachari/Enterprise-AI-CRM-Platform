/**
 * Multer Upload Middleware
 * - Memory storage (no temp files on disk)
 * - MIME type + extension whitelist
 * - 5 MB max file size with friendly error message
 * - Rejects GIF, SVG, HEIC, executables
 */
import multer, { FileFilterCallback, MulterError } from 'multer';
import { Request, Response, NextFunction } from 'express';
import path from 'path';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// Memory storage — buffer accessible via req.file.buffer
const storage = multer.memoryStorage();

// File filter — validates MIME type and extension
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase());
  const extOk  = ALLOWED_EXTENSIONS.has(ext);

  if (mimeOk && extOk) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file format "${ext || file.mimetype}". ` +
        'Allowed formats: JPG, JPEG, PNG, WEBP.'
      )
    );
  }
};

// Multer instance for avatar uploads
export const avatarUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

/**
 * Express error-handler wrapper for Multer errors.
 * Transforms Multer errors into user-friendly JSON instead of raw 500/413.
 */
export const handleMulterError = (
  err: any,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        message: 'Image exceeds the maximum allowed size of 5 MB. Please upload a smaller image.',
      });
      return;
    }
    res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
    return;
  }

  // Non-multer error (e.g. file filter rejection)
  if (err instanceof Error && err.message.includes('Unsupported file format')) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
    return;
  }

  next(err);
};
