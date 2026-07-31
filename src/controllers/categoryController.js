import MenuItem from "../models/Menu.js";

const MENU_CATEGORIES = [
  "Burgers & Fries",
  "Pizza",
  "Sandwiches & Wraps",
  "Fried & Crispy",
  "main",
];

export const getCategories = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      count: MENU_CATEGORIES.length,
      data: MENU_CATEGORIES,
    });
  } catch (error) {
    next(error);
  }
};
