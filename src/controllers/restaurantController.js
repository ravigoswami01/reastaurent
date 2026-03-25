import Restaurant from "../models/Restaurant.js";
import User from "../models/User.js";

export const getAllRestaurants = async (req, res, next) => {
  try {
    const { search, cuisine, isActive, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }
    if (cuisine) filter.cuisine = { $in: cuisine.split(",") };
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const restaurants = await Restaurant.find(filter)
      .populate("ownerId", "name email")
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const total = await Restaurant.countDocuments(filter);

    res.json({
      success: true,
      restaurants,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getRestaurantById = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).populate(
      "ownerId",
      "name email",
    );
    if (!restaurant)
      return res.status(404).json({ error: "Restaurant not found" });
    res.json({ success: true, restaurant });
  } catch (err) {
    next(err);
  }
};

export const createRestaurant = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const {
      name,
      address,
      phone,
      cuisine,
      tables,
      ownerId: requestedOwnerId,
    } = req.body;

    if (!name || !address)
      return res.status(400).json({ error: "Name and address required" });

    const ownerId =
      req.user.role === "admin" && requestedOwnerId
        ? requestedOwnerId
        : req.user.userId;

    const restaurant = new Restaurant({
      name,
      address,
      phone: phone || "",
      cuisine: cuisine || [],
      tables: tables || [],
      ownerId,
      isActive: true,
    });

    await restaurant.save();

    await User.findByIdAndUpdate(ownerId, {
      $addToSet: { restaurantIds: restaurant._id },
    });

    res.status(201).json({ success: true, restaurant });
  } catch (err) {
    next(err);
  }
};

export const updateRestaurant = async (req, res, next) => {
  try {
    const { name, address, phone, cuisine, isActive, tables } = req.body;

    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant)
      return res.status(404).json({ error: "Restaurant not found" });

    const userCanEdit =
      req.user.role === "admin" ||
      (req.user.role === "owner" &&
        restaurant.ownerId.toString() === req.user.userId) ||
      (["manager", "staff"].includes(req.user.role) &&
        req.user.restaurantIds.includes(restaurant._id.toString()));

    if (!userCanEdit) return res.status(403).json({ error: "Forbidden" });

    if (name !== undefined) restaurant.name = name;
    if (address !== undefined) restaurant.address = address;
    if (phone !== undefined) restaurant.phone = phone;
    if (cuisine !== undefined) restaurant.cuisine = cuisine;
    if (isActive !== undefined)
      restaurant.isActive = isActive === "true" || isActive === true;
    if (tables !== undefined) restaurant.tables = tables;

    await restaurant.save();

    res.json({ success: true, restaurant });
  } catch (err) {
    next(err);
  }
};

export const deleteRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant)
      return res.status(404).json({ error: "Restaurant not found" });

    if (req.user.role !== "admin")
      return res.status(403).json({ error: "Forbidden" });

    restaurant.isActive = false;
    await restaurant.save();

    res.json({ success: true, message: "Restaurant deactivated successfully" });
  } catch (err) {
    next(err);
  }
};
