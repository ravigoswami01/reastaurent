import Cart from "../models/cart.models.js";
import MenuItem from "../models/Menu.js";

const calculateTotal = (items) =>
  items.reduce((acc, item) => acc + item.price * item.quantity, 0);

export const addToCart = async (req, res) => {
  try {
    const { menuItemId, quantity = 1 } = req.body;
    const userId = req.user.id;

    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const index = cart.items.findIndex(
      (item) => item.menuItem.toString() === menuItemId,
    );

    if (index > -1) {
      cart.items[index].quantity += quantity;
    } else {
      cart.items.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity,
        image: menuItem.image,
      });
    }

    cart.totalAmount = calculateTotal(cart.items);
    await cart.save();

    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      (item) => item.menuItem.toString() !== menuItemId,
    );

    cart.totalAmount = calculateTotal(cart.items);
    await cart.save();

    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { menuItemId, quantity } = req.body;
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find(
      (item) => item.menuItem.toString() === menuItemId,
    );

    if (!item) {
      return res.status(404).json({ message: "Item not in cart" });
    }

    if (quantity <= 0) {
      cart.items = cart.items.filter(
        (i) => i.menuItem.toString() !== menuItemId,
      );
    } else {
      item.quantity = quantity;
    }

    cart.totalAmount = calculateTotal(cart.items);
    await cart.save();

    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId }).populate(
      "items.menuItem",
    );

    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.json({ success: true, message: "Cart already empty" });
    }

    cart.items = [];
    cart.totalAmount = 0;

    await cart.save();

    res.json({ success: true, message: "Cart cleared" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAPIStatus = (req, res) => {
  res.send("API Working");
};
