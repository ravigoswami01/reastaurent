import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { allowRoles, isResourceOwner } from "../middlewares/rbac.js";
import Restaurant from "../models/Restaurant.js";
import * as restaurantController from "../controllers/restaurantController.js";

const router = express.Router();

router.get("/", restaurantController.getAllRestaurants);
router.get("/:id", restaurantController.getRestaurantById);

// ----------------------------------------------------------------------
// All routes below require authentication
// ----------------------------------------------------------------------
router.use(authMiddleware);

router.post(
  "/create",
  authMiddleware,
  allowRoles("owner", "admin"),
  restaurantController.createRestaurant,
);

// Update restaurant – only owner of that restaurant OR admin
router.put(
  "/:id",
  isResourceOwner(Restaurant, "id"),
  restaurantController.updateRestaurant,
);

router.delete(
  "/:id",
  allowRoles("admin"),
  restaurantController.deleteRestaurant,
);

export default router;
