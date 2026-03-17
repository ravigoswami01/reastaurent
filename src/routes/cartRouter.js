import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import {
  addToCart,
  removeFromCart,
  updateCartItem,
  getCart,
  clearCart,
  getAPIStatus,
} from "../controllers/cartcontroller.js";

const router = express.Router();

router.post("/add", authMiddleware, addToCart);
router.get("/status", getAPIStatus);
router.delete("/remove/:menuItemId", authMiddleware, removeFromCart);
router.put("/update", authMiddleware, updateCartItem);
router.get("/", authMiddleware, getCart);
router.delete("/clear", authMiddleware, clearCart);

export default router;
