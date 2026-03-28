import mongoose from "mongoose";
import User from "../models/User.js";
import Restaurant from "../models/Restaurant.js";
import { generateToken } from "../utils/jwt.js";

export const register = async (req, res, next) => {
  try {
    const { email, password, name, role, restaurantId } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!["admin", "owner", "manager", "staff", "customer"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    if ((role === "staff" || role === "manager") && !restaurantId) {
      return res
        .status(400)
        .json({ error: "restaurantId is required for staff/manager" });
    }

    if (role === "owner") {
      const user = new User({ email, password, name, role });
      await user.save();

      const token = generateToken(user);

      return res.status(201).json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          restaurantId: null,
        },
        token,
        nextStep: "CREATE_RESTAURANT",
      });
    }

    const user = new User({
      email,
      password,
      name,
      role,
      restaurantId: restaurantId || null,
    });

    await user.save();

    const token = generateToken(user);

    return res.status(201).json({
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

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user);

    return res.json({
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
  session.startTransaction();

  try {
    const { name, email, password, restaurant } = req.body;

    if (!name || !email || !password) {
      await session.abortTransaction();
      return res.status(400).json({ error: "All fields required" });
    }

    if (!restaurant?.name || !restaurant?.address) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ error: "Restaurant name and address required" });
    }

    const existingUser = await User.findOne({ email }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      return res.status(400).json({ error: "Email already registered" });
    }

    const user = new User({ name, email, password, role: "owner" });
    await user.save({ session });

    const newRestaurant = new Restaurant({
      ...restaurant,
      ownerId: user._id,
    });

    await newRestaurant.save({ session });

    user.restaurantId = newRestaurant._id;
    await user.save({ session });

    await session.commitTransaction();

    const token = generateToken(user);

    return res.status(201).json({
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
    next(err);
  } finally {
    session.endSession();
  }
};
