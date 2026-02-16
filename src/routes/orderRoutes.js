// routes/orderRoutes.js
import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { allowRoles } from "../middlewares/rbac.js";
import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  assignOrder,
  getOrderStats,
} from "../controllers/orderController.js";

const router = express.Router();

router.post("/", authMiddleware, createOrder);
router.get("/", authMiddleware, getAllOrders);
router.get(
  "/stats",
  authMiddleware,
  //   authorize(["staff", "owner", "admin"]),
  allowRoles,
  getOrderStats,
);
router.get("/:id", authMiddleware, getOrderById);
router.patch("/:id/status", authMiddleware, updateOrderStatus);
router.patch("/:id/assign", authMiddleware, allowRoles, assignOrder);

export default router;
