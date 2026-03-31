import Cart from "../models/cart.models.js";
import MenuItem from "../models/Menu.js";

const POPULATE_MENU_ITEM = {
  path: "items.menuItem",
  select: "name description imageUrl price category isAvailable",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const calculateTotal = (items) =>
  items.reduce((acc, item) => acc + item.price * item.quantity, 0);

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = new Cart({ user: userId, items: [], totalAmount: 0 });
  }
  return cart;
};

const saveAndPopulate = async (cart) => {
  cart.totalAmount = calculateTotal(cart.items);
  await cart.save();
  await cart.populate(POPULATE_MENU_ITEM);
  return cart;
};

// ─── Controllers ──────────────────────────────────────────────────────────────

export const getCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);

    if (cart.isNew) {
      await cart.save();
    } else {
      await cart.populate(POPULATE_MENU_ITEM);
    }

    return res.status(200).json({ success: true, cart });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { menuItemId, quantity = 1 } = req.body;

    if (!menuItemId) {
      return res
        .status(400)
        .json({ success: false, message: "menuItemId is required" });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res
        .status(400)
        .json({ success: false, message: "quantity must be a positive integer" });
    }

    const menuItem = await MenuItem.findById(menuItemId).lean();

    if (!menuItem) {
      return res
        .status(404)
        .json({ success: false, message: "Menu item not found" });
    }

    if (!menuItem.isAvailable) {
      return res
        .status(400)
        .json({ success: false, message: "Menu item is currently unavailable" });
    }

    const cart = await getOrCreateCart(req.user.id);

    const existingIndex = cart.items.findIndex(
      (item) => item.menuItem.toString() === menuItemId
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += quantity;
    } else {
      cart.items.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        description: menuItem.description ?? "",
        price: menuItem.price,
        image: menuItem.imageUrl ?? "",
        quantity,
      });
    }

    const updatedCart = await saveAndPopulate(cart);

    return res.status(200).json({ success: true, cart: updatedCart });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { menuItemId, quantity } = req.body;

    if (!menuItemId) {
      return res
        .status(400)
        .json({ success: false, message: "menuItemId is required" });
    }

    if (!Number.isInteger(quantity) || quantity < 0) {
      return res
        .status(400)
        .json({ success: false, message: "quantity must be a non-negative integer" });
    }

    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.menuItem.toString() === menuItemId
    );

    if (itemIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in cart" });
    }

    if (quantity === 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    const updatedCart = await saveAndPopulate(cart);

    return res.status(200).json({ success: true, cart: updatedCart });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const { menuItemId } = req.params;

    if (!menuItemId) {
      return res
        .status(400)
        .json({ success: false, message: "menuItemId is required" });
    }

    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    const originalLength = cart.items.length;
    cart.items = cart.items.filter(
      (item) => item.menuItem.toString() !== menuItemId
    );

    if (cart.items.length === originalLength) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in cart" });
    }

    const updatedCart = await saveAndPopulate(cart);

    return res.status(200).json({ success: true, cart: updatedCart });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart || cart.items.length === 0) {
      return res
        .status(200)
        .json({ success: true, message: "Cart is already empty" });
    }

    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();

    return res.status(200).json({ success: true, cart });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAPIStatus = (_req, res) => {
  res.status(200).json({ success: true, message: "Cart API is running" });
};