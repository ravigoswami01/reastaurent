import mongoose from "mongoose";
import User from "../models/User.js";
import Restaurant from "../models/Restaurant.js";
import { generateToken } from "../utils/jwt.js";

export const register = async (req, res, next) => {
  try {
    const { email, password, name, role, restaurantId } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    if ((role === "staff" || role === "owner") && !restaurantId) {
      return res
        .status(400)
        .json({ error: "restaurantId is required for staff/owner role" });
    }

    const user = new User({ email, password, name, role, restaurantId });
    await user.save();

    const token = generateToken(user);

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId || null,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId || null,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
};

export const registerOwnerWithRestaurant = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const { name, email, password, restaurant } = req.body;

    if (!name || !email || !password) {
      throw new Error("Name, email and password are required");
    }

    if (!restaurant?.name || !restaurant?.address) {
      throw new Error("Restaurant name and address are required");
    }

    const existingUser = await User.findOne({ email }).session(session);
    if (existingUser) {
      throw new Error("Email already registered");
    }

    const user = new User({
      name,
      email,
      password,
      role: "owner",
    });

    await user.save({ session, validateBeforeSave: false });

    const newRestaurant = new Restaurant({
      ...restaurant,
      ownerId: user._id,
    });

    await newRestaurant.save({ session });

    user.restaurantId = newRestaurant._id;
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    const token = generateToken(user);

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
      },
      restaurant: newRestaurant,
      token,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};
