import express from "express";
import {
  createBooking,
  getAvailableSlots,
  getMyBookings,
  getAllBookings,
  updateBookingStatus,
  deleteBooking,
} from "../controllers/bookingController.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

router.post("/", authMiddleware, createBooking);
router.get("/available-slots", getAvailableSlots);
router.get("/my", authMiddleware, getMyBookings);
router.get("/", authMiddleware, getAllBookings);
router.put("/:id/status", authMiddleware, updateBookingStatus);
router.delete("/:id", authMiddleware, deleteBooking);

export default router;
