import MenuItem from "../models/Menu.js";
import Restaurant from "../models/Restaurant.js";
import cloudinary from "../config/cloudinary.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

const toBool = (v) => v === true || v === "true";
const parseNum = (v, d) => (Number.isNaN(parseInt(v)) ? d : parseInt(v));

const normalizeCategory = (cat) => {
  const map = {
    "Burgers & Fries": "burgers",
    "Fried & Crispy": "burgers",
    "Sandwiches & Wraps": "salads",
    Pizza: "pizza",
    main: "burgers",
  };
  return map[cat] || cat?.toLowerCase() || "burgers";
};

const buildFilter = ({ restaurantId, category, search, isAvailable, minRating }) => {
  const filter = { isActive: true };

  if (restaurantId) filter.restaurantId = restaurantId;
  if (category) filter.category = normalizeCategory(category);
  if (isAvailable !== undefined) filter.isAvailable = toBool(isAvailable);
  if (search) filter.$text = { $search: search };

  if (minRating !== undefined) {
    const min = parseFloat(minRating);
    if (!Number.isNaN(min)) filter["rating.average"] = { $gte: min };
  }

  return filter;
};

const buildSort = (sortBy) => {
  const sorts = {
    rating: { "rating.average": -1, "rating.count": -1 },
    priceLowHigh: { price: 1 },
    priceHighLow: { price: -1 },
  };
  return sorts[sortBy] ?? { createdAt: -1 };
};

const paginationMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

const authorizeRestaurantAccess = (user, targetRestaurantId) => {
  if (user.role === "admin") return;

  if (!user.restaurantId) {
    const err = new Error("No restaurant assigned");
    err.status = 403;
    throw err;
  }

  if (user.restaurantId.toString() !== targetRestaurantId.toString()) {
    const err = new Error("Unauthorized restaurant access");
    err.status = 403;
    throw err;
  }
};

const uploadImage = (buffer, mimetype) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "restaurant-menu", resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });

const deleteImage = (publicId) => {
  if (!publicId) return Promise.resolve();
  return cloudinary.uploader.destroy(publicId);
};

const normalizeTags = (tags) => {
  if (!tags) return [];
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }
  if (Array.isArray(tags)) return tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
  return [];
};

const formatItem = (item) => ({
  _id: item._id,
  name: item.name,
  description: item.description || "",
  price: item.price,
  originalPrice: item.originalPrice ?? null,
  category: normalizeCategory(item.category),
  tags: item.tags ?? [],
  prepTime: item.prepTime ?? 10,
  calories: item.calories ?? 0,
  imageUrl: item.imageUrl || "",
  rating: item.rating?.average || 0,
  reviews: item.rating?.count || 0,
  isAvailable: item.isAvailable ?? true,
  restaurantName: item.restaurantId?.name || "",
});

export const getAllMenuItems = async (req, res, next) => {
  try {
    const page = parseNum(req.query.page, DEFAULT_PAGE);
    const limit = parseNum(req.query.limit, DEFAULT_LIMIT);
    const skip = (page - 1) * limit;

    const filter = buildFilter(req.query);
    const sort = buildSort(req.query.sortBy);

    const [items, total] = await Promise.all([
      MenuItem.find(filter)
        .populate("restaurantId", "name")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      MenuItem.countDocuments(filter),
    ]);

    res.json({
      items: items.map(formatItem),
      pagination: paginationMeta(page, limit, total),
    });
  } catch (err) {
    next(err);
  }
};

export const getMenuItemById = async (req, res, next) => {
  try {
    const item = await MenuItem.findOne({ _id: req.params.id, isActive: true })
      .populate("restaurantId", "name")
      .lean();

    if (!item) return res.status(404).json({ error: "Not found" });

    res.json(formatItem(item));
  } catch (err) {
    next(err);
  }
};

export const createMenuItem = async (req, res, next) => {
  let uploadedPublicId = null;

  try {
    const { restaurantId, category } = req.body;

    const restaurant = await Restaurant.findById(restaurantId).lean();
    if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

    authorizeRestaurantAccess(req.user, restaurantId);

    let imageData = { url: "", publicId: "" };

    if (req.file) {
      imageData = await uploadImage(req.file.buffer, req.file.mimetype);
      uploadedPublicId = imageData.publicId;
    }

    const item = await MenuItem.create({
      ...req.body,
      category: normalizeCategory(category),
      tags: normalizeTags(req.body.tags),
      imageUrl: imageData.url,
      imagePublicId: imageData.publicId,
      rating: { average: 0, count: 0 },
      isActive: true,
    });

    res.status(201).json(item);
  } catch (err) {
    if (uploadedPublicId) deleteImage(uploadedPublicId).catch(() => { });

    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

export const updateMenuItem = async (req, res, next) => {
  let newPublicId = null;

  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });

    authorizeRestaurantAccess(req.user, item.restaurantId);

    const oldPublicId = item.imagePublicId || null;

    if (req.file) {
      const uploaded = await uploadImage(req.file.buffer, req.file.mimetype);
      newPublicId = uploaded.publicId;
      item.imageUrl = uploaded.url;
      item.imagePublicId = uploaded.publicId;
    }

    const updatableFields = ["name", "description", "price", "originalPrice", "category", "isAvailable", "prepTime", "calories"];

    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        item[field] = field === "category" ? normalizeCategory(req.body[field]) : req.body[field];
      }
    }

    if (req.body.tags !== undefined) {
      item.tags = normalizeTags(req.body.tags);
    }

    await item.save();

    if (req.file && oldPublicId) deleteImage(oldPublicId).catch(() => { });

    res.json(item);
  } catch (err) {
    if (newPublicId) deleteImage(newPublicId).catch(() => { });

    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

export const deleteMenuItem = async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });

    authorizeRestaurantAccess(req.user, item.restaurantId);

    item.isActive = false;
    await item.save();

    res.json({ message: "Menu item deactivated" });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

export const rateMenuItem = async (req, res, next) => {
  try {
    const value = parseFloat(req.body.rating);

    if (Number.isNaN(value) || value < 1 || value > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      [
        {
          $set: {
            "rating.count": { $add: ["$rating.count", 1] },
            "rating.average": {
              $round: [
                {
                  $divide: [
                    { $add: [{ $multiply: ["$rating.average", "$rating.count"] }, value] },
                    { $add: ["$rating.count", 1] },
                  ],
                },
                2,
              ],
            },
          },
        },
      ],
      { new: true, select: "rating" },
    );

    if (!item) return res.status(404).json({ error: "Not found" });

    res.json({ rating: item.rating });
  } catch (err) {
    next(err);
  }
};