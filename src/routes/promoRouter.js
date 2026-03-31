import express from "express";
import { applyPromo, createPromo } from "../controllers/promoController.js";
import { validateCreatePromo } from "../validators/promoValidator.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

router.post("/apply", applyPromo);
router.post("/create", authMiddleware, validateCreatePromo, createPromo);

export default router;