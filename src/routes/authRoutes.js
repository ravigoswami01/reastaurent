import express from "express";
import {
  register,
  login,
  registerOwnerWithRestaurant,
} from "../controllers/userController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/register-with-restaurant", registerOwnerWithRestaurant);

export default router;
