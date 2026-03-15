import Restaurant from "../models/Restaurant.js";
import Category from "../models/category.js";
import MenuItem from "../models/Menu.js";

export const getRestaurants = async (req, res, next) => {
  try {
    const { search, cuisine, page = 1, limit = 10 } = req.query;

    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }
    if (cuisine) filter.cuisine = { $in: cuisine.split(",") };

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

export const getCategories = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const categories = await Category.find({
      restaurantId,
      isActive: true,
    })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Category.countDocuments({
      restaurantId,
      isActive: true,
    });

    res.json({
      categories,
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

export const getMenuItems = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { category, search, page = 1, limit = 10 } = req.query;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    const filter = {
      restaurantId,
      isActive: true,
    };

    if (category) filter.category = category;
    if (search) filter.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const items = await MenuItem.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await MenuItem.countDocuments(filter);

    res.json({
      items,
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
