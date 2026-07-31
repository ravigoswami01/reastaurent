import express from "express";
import { chatWithChef } from "../controllers/Ai_controller.js";

const router = express.Router();

router.post("/chat", chatWithChef);

export default router;