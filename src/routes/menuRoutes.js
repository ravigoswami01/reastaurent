import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { allowRoles } from "../middlewares/rbac.js";
import * as menuController from "../controllers/menuController.js";

import {
  validateMenuItem,
  handleValidation,
} from "../validators/menuValidators.js";

import { upload } from "../middlewares/uplode.js";

const router = express.Router();

// ---------- Public ----------
router.get("/", menuController.getAllMenuItems);
router.get("/:id", menuController.getMenuItemById);

// ---------- Protected ----------

// CREATE menu item
router.post(
  "/",
  authMiddleware,
  allowRoles("owner", "staff", "admin"),
  upload.single("image"),
  validateMenuItem,
  handleValidation,
  menuController.createMenuItem,
);

// UPDATE menu item
router.put(
  "/:id",
  authMiddleware,
  allowRoles("owner", "staff", "admin"),
  upload.single("image"),
  menuController.updateMenuItem,
);

// DELETE (soft delete)
router.delete(
  "/:id",
  authMiddleware,
  allowRoles("admin", "owner"),
  menuController.deleteMenuItem,
);

export default router;
