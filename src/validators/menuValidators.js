import { body, validationResult } from "express-validator";
import { MENU_CATEGORIES } from "../models/Menu.js";

const CATEGORY_ALIASES = [
  "Burgers & Fries",
  "Fried & Crispy",
  "Sandwiches & Wraps",
  "Pizza",
  "main",
];

const ACCEPTED_CATEGORIES = [...MENU_CATEGORIES, ...CATEGORY_ALIASES];

export const validateMenuItem = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 120 }).withMessage("Name must be 2–120 characters"),

  body("price")
    .notEmpty().withMessage("Price is required")
    .isFloat({ min: 0 }).withMessage("Price must be a positive number"),

  body("originalPrice")
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage("Original price must be a positive number"),

  body("category")
    .notEmpty().withMessage("Category is required")
    .custom((value) => {
      if (typeof value !== "string") throw new Error("Category must be a string");
      const normalized = value.trim().toLowerCase();
      const acceptedLower = ACCEPTED_CATEGORIES.map((c) => c.toLowerCase());
      if (acceptedLower.includes(normalized)) {
        return true;
      }
      throw new Error(`Invalid category. Accepted categories: ${MENU_CATEGORIES.join(", ")}`);
    }),

  body("restaurantId")
    .notEmpty().withMessage("restaurantId is required")
    .isMongoId().withMessage("restaurantId must be a valid MongoDB ObjectId"),

  body("tags")
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) return true;
      if (typeof value === "string") return true;
      throw new Error("tags must be an array or string");
    }),

  body("prepTime")
    .optional()
    .isInt({ min: 1 }).withMessage("prepTime must be a positive integer"),

  body("calories")
    .optional()
    .isInt({ min: 0 }).withMessage("calories must be a non-negative integer"),

  body("isAvailable")
    .optional()
    .isBoolean().withMessage("isAvailable must be true or false"),
];

export const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};