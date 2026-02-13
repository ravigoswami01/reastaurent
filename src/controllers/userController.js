import mongoose from "mongoose";
import User from "../models/User.js";
import Restaurant from "../models/Restaurant.js";
import { generateToken } from "../utils/jwt.js";

// ----------------------------------------------------------------------
// 1. REGISTER – Standard user registration (any role)
// ----------------------------------------------------------------------
export const register = async (req, res, next) => {
  try {
    const { email, password, name, role, restaurantId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Create new user (schema validation will enforce restaurantId for staff)
    const user = new User({ email, password, name, role, restaurantId });
    await user.save();

    // Generate JWT
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
    next(err); // Pass to Express error handler
  }
};

// ----------------------------------------------------------------------
// 2. LOGIN – Authenticate user and return JWT
// ----------------------------------------------------------------------
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email, explicitly include password field
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Compare provided password with stored hash
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT
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

// ----------------------------------------------------------------------
// 3. FAST TRACK – Register owner + create restaurant in one atomic call
//    ⚠️ Requires MongoDB replica set (transactions)
// ----------------------------------------------------------------------
export const registerOwnerWithRestaurant = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, email, password, restaurant } = req.body;

    // --- Validate required fields ---
    if (!name || !email || !password) {
      throw new Error("Name, email and password are required");
    }
    if (!restaurant || !restaurant.name || !restaurant.address) {
      throw new Error("Restaurant name and address are required");
    }

    // --- Check if email is already registered ---
    const existingUser = await User.findOne({ email }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Email already registered" });
    }

    // --- 1. Create user with role 'owner' (restaurantId will be set later) ---
    const user = new User({
      name,
      email,
      password,
      role: "owner",
      // restaurantId intentionally omitted – will be set after restaurant creation
    });
    await user.save({ session });

    // --- 2. Create restaurant and link to owner ---
    const newRestaurant = new Restaurant({
      ...restaurant,
      ownerId: user._id,
    });
    await newRestaurant.save({ session });

    // --- 3. Update user with the newly created restaurant ID ---
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
      restaurant: {
        _id: newRestaurant._id,
        name: newRestaurant.name,
        address: newRestaurant.address,
        phone: newRestaurant.phone || null,
        cuisine: newRestaurant.cuisine || [],
        isActive: newRestaurant.isActive,
      },
      token,
    });
  } catch (err) {
    // --- Rollback transaction on error ---
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};
