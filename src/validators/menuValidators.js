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
      const normalized = value?.toLowerCase?.() ?? value;
      if (
        MENU_CATEGORIES.includes(normalized) ||
        CATEGORY_ALIASES.includes(value)
      ) {
        return true;
      }
      throw new Error(`Invalid category. Accepted: ${ACCEPTED_CATEGORIES.join(", ")}`);
    }),

  body("restaurantId")
    .notEmpty().withMessage("restaurantId is required")
    .isMongoId().withMessage("restaurantId must be a valid MongoDB ObjectId"),

  body("tags")
    .notEmpty().withMessage("At least one tag is required")
    .custom((value) => {
      if (Array.isArray(value) && value.length > 0) return true;
      if (typeof value === "string" && value.trim().length > 0) return true;
      throw new Error("tags must be a non-empty array or comma-separated string");
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