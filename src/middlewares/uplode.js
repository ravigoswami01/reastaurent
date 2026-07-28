import multer from "multer";

const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only jpeg/jpg/png/webp images are allowed"), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});
