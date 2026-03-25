import Booking from "../models/booking.js";
import { TIME_SLOTS } from "../utils/timeSlots.js";

export const createBooking = async (req, res) => {
  try {
    const { name, phone, guests, tableNumber, date, timeSlot } = req.body;

    if (!TIME_SLOTS.includes(timeSlot)) {
      return res.status(400).json({ message: "Invalid time slot" });
    }

    const existingBooking = await Booking.findOne({
      tableNumber,
      bookingDate: new Date(date),
      timeSlot,
      status: { $ne: "cancelled" },
    });

    if (existingBooking) {
      return res.status(400).json({
        message: "Table already booked for this time slot",
      });
    }

    const booking = new Booking({
      user: req.user.id,
      name,
      phone,
      guests,
      tableNumber,
      bookingDate: new Date(date), // ✅ correct field
      timeSlot,
    });

    await booking.save();

    res.status(201).json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAvailableSlots = async (req, res) => {
  try {
    const { date, tableNumber } = req.query;

    const bookings = await Booking.find({
      date,
      tableNumber,
      status: { $ne: "cancelled" },
    });

    const bookedSlots = bookings.map((b) => b.timeSlot);

    const availableSlots = TIME_SLOTS.filter(
      (slot) => !bookedSlots.includes(slot),
    );

    res.json({ success: true, availableSlots });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id }).sort({
      createdAt: -1,
    });

    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json({ success: true, message: "Booking deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
