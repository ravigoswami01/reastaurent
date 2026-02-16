import { body, validationResult } from "express-validator";

const categories = ["appetizer", "main", "dessert", "beverage"];

export const validateMenuItem = [
  body("price")
    .toFloat()
    .isFloat({ gt: 0 })
    .withMessage("Price must be greater than 0"),

  body("category")
    .optional()
    .trim()
    .isIn(categories)
    .withMessage("Invalid category"),

  body("restaurantId")
    .notEmpty()
    .withMessage("Restaurant ID required")
    .bail()
    .isMongoId()
    .withMessage("Invalid restaurant ID"),
];

export const validateBulkAvailability = [
  body("ids").isArray({ min: 1 }).withMessage("ids must be a non-empty array"),

  body("ids.*").isMongoId().withMessage("Each id must be valid MongoID"),

  body("isAvailable")
    .toBoolean()
    .isBoolean()
    .withMessage("isAvailable must be boolean"),
];

export const handleValidation = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array({ onlyFirstError: true }),
    });
  }

  next();
};
