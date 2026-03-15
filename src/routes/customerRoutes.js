import express from "express";
import * as customerController from "../controllers/customerController.js";

const router = express.Router();

router.get("/", customerController.getRestaurants);
router.get("/:restaurantId/categories", customerController.getCategories);
router.get("/:restaurantId/menu-items", customerController.getMenuItems);

export default router;
