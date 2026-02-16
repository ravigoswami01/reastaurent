import MenuItem from "../models/Menu.js";
import Restaurant from "../models/Restaurant.js";
import cloudinary from "../config/cloudinary.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

const toBool = (v) => v === true || v === "true";
const parseNum = (v, d) => (Number.isNaN(parseInt(v)) ? d : parseInt(v));

const buildFilter = ({ restaurantId, category, search, isAvailable }) => {
  const filter = { isActive: true };
  if (restaurantId) filter.restaurantId = restaurantId;
  if (category) filter.category = category;
  if (isAvailable !== undefined) filter.isAvailable = toBool(isAvailable);
  if (search) filter.$text = { $search: search };
  return filter;
};

const paginationMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

const authorizeRestaurantAccess = (
  user,
  targetRestaurantId,
  allowAdmin = true,
) => {
  if (allowAdmin && user.role === "admin") return;
  if (!user.restaurantId) {
    const error = new Error("No restaurant assigned");
    error.status = 403;
    throw error;
  }
  if (user.restaurantId.toString() !== targetRestaurantId.toString()) {
    const error = new Error("Unauthorized restaurant access");
    error.status = 403;
    throw error;
  }
};

const uploadImage = async (file) => {
  if (!file) return null;

  const b64 = Buffer.from(file.buffer).toString("base64");
  const dataURI = `data:${file.mimetype};base64,${b64}`;

  const result = await cloudinary.uploader.upload(dataURI, {
    folder: "restaurant-menu",
    resource_type: "image",
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
};

const deleteImage = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
};

export const getAllMenuItems = async (req, res, next) => {
  try {
    const page = parseNum(req.query.page, DEFAULT_PAGE);
    const limit = parseNum(req.query.limit, DEFAULT_LIMIT);
    const skip = (page - 1) * limit;
    const filter = buildFilter(req.query);

    const [items, total] = await Promise.all([
      MenuItem.find(filter)
        .populate("restaurantId", "name")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      MenuItem.countDocuments(filter),
    ]);

    res.json({
      items,
      pagination: paginationMeta(page, limit, total),
    });
  } catch (err) {
    next(err);
  }
};

export const getMenuItemById = async (req, res, next) => {
  try {
    const item = await MenuItem.findOne({
      _id: req.params.id,
      isActive: true,
    }).populate("restaurantId", "name");

    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

export const createMenuItem = async (req, res, next) => {
  try {
    const { restaurantId } = req.body;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant)
      return res.status(404).json({ error: "Restaurant not found" });

    authorizeRestaurantAccess(req.user, restaurantId);

    let imageData = { url: "", publicId: "" };

    if (req.file) {
      const uploadResult = await uploadImage(req.file);
      imageData = {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
      };
    }

    const item = await MenuItem.create({
      ...req.body,
      imageUrl: imageData.url,
      imagePublicId: imageData.publicId,
      isActive: true,
    });

    res.status(201).json(item);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

export const updateMenuItem = async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });

    authorizeRestaurantAccess(req.user, item.restaurantId);

    if (req.file) {
      if (item.imagePublicId) {
        await deleteImage(item.imagePublicId);
      }
      const uploadResult = await uploadImage(req.file);
      item.imageUrl = uploadResult.url;
      item.imagePublicId = uploadResult.publicId;
    }

    const fields = ["name", "description", "price", "category", "isAvailable"];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        item[f] = req.body[f];
      }
    });

    await item.save();
    res.json(item);
  } catch (err) {
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
