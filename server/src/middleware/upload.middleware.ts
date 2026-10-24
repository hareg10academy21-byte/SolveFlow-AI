import multer from 'multer';

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const uploadImage = multer({
  dest: process.env.UPLOAD_DIRECTORY ?? 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => callback(null, allowedImageTypes.has(file.mimetype)),
});
