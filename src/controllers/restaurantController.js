import Restaurant from "../models/Restaurant.js";
import User from "../models/User.js";

// ----------------------------------------------------------------------
// @desc    Get all restaurants (public, with filtering & pagination)
// @route   GET /api/restaurants
// @access  Public
// ----------------------------------------------------------------------
export const getAllRestaurants = async (req, res, next) => {
  try {
    const { search, cuisine, isActive, page = 1, limit = 10 } = req.query;

    // Build filter object
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }
    if (cuisine) filter.cuisine = { $in: cuisine.split(",") };
    if (isActive !== undefined) filter.isActive = isActive === "true";

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const restaurants = await Restaurant.find(filter)
      .populate("ownerId", "name email")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Restaurant.countDocuments(filter);

    res.json({
      restaurants,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------------
// @desc    Get single restaurant by ID
// @route   GET /api/restaurants/:id
// @access  Public
// ----------------------------------------------------------------------
export const getRestaurantById = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).populate(
      "ownerId",
      "name email",
    );

    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    res.json(restaurant);
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------------
// @desc    Create a new restaurant
// @route   POST /api/restaurants
// @access  Private (Owner, Admin)
// ----------------------------------------------------------------------
export const createRestaurant = async (req, res, next) => {
  try {
    const { name, address, phone, cuisine, tables } = req.body;

    // Owner is automatically set to the logged-in user
    const ownerId = req.user.userId;

    // Check if user already owns a restaurant (optional business rule)
    const existingRestaurant = await Restaurant.findOne({ ownerId });
    if (existingRestaurant && req.user.role === "owner") {
      return res.status(400).json({ error: "You already own a restaurant" });
    }

    const restaurant = new Restaurant({
      name,
      address,
      phone,
      cuisine,
      tables,
      ownerId,
      isActive: true,
    });

    await restaurant.save();

    // Link this restaurant to the owner's profile
    await User.findByIdAndUpdate(ownerId, { restaurantId: restaurant._id });

    res.status(201).json(restaurant);
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------------
// @desc    Update a restaurant
// @route   PUT /api/restaurants/:id
// @access  Private (Owner of that restaurant, Admin)
// ----------------------------------------------------------------------
export const updateRestaurant = async (req, res, next) => {
  try {
    const { name, address, phone, cuisine, isActive, tables } = req.body;

    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    if (
      req.user.role !== "admin" &&
      restaurant.ownerId.toString() !== req.user.userId
    ) {
      return res
        .status(403)
        .json({ error: "You don't have permission to update this restaurant" });
    }

    if (name !== undefined) restaurant.name = name;
    if (address !== undefined) restaurant.address = address;
    if (phone !== undefined) restaurant.phone = phone;
    if (cuisine !== undefined) restaurant.cuisine = cuisine;
    if (isActive !== undefined) restaurant.isActive = isActive;
    if (tables !== undefined) restaurant.tables = tables;

    await restaurant.save();

    res.json(restaurant);
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------------
// @desc    Delete a restaurant (soft delete: set isActive = false)
// @route   DELETE /api/restaurants/:id
// @access  Private (Admin only)
// ----------------------------------------------------------------------
export const deleteRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    restaurant.isActive = false;
    await restaurant.save();

    res.json({ message: "Restaurant deactivated successfully" });
  } catch (err) {
    next(err);
  }
};
