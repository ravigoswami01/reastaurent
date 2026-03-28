import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { allowRoles, isResourceOwner } from "../middlewares/rbac.js";

import {
  getAllRestaurants,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
} from "../controllers/restaurantController.js";

const router = express.Router();

// ✅ Public
router.get("/", getAllRestaurants);

// ✅ Only OWNER can create
router.post("/", isResourceOwner, allowRoles("owner"), createRestaurant);

// ✅ Only OWNER of that restaurant can update
router.put(
  "/:restaurantId",
  isResourceOwner,
  allowRoles("owner"),
  isResourceOwner,
  updateRestaurant,
);

// ✅ Only OWNER of that restaurant can delete
router.delete(
  "/:restaurantId",
  isResourceOwner,
  allowRoles("owner"),
  authMiddleware,
  deleteRestaurant,
);

export default router;
