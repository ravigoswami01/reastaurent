import MenuItem from "../models/Menu.js";
import mongoose from "mongoose";

export const validateItems = async (items, restaurantId, session) => {
  const ids = items.map((i) => new mongoose.Types.ObjectId(i.menuItemId));

  const menuItems = await MenuItem.find({
    _id: { $in: ids },
    restaurantId,
    isActive: true,
  }).session(session);

  if (menuItems.length !== items.length) {
    throw new Error("Some menu items invalid or inactive");
  }

  return items.map((item) => {
    const menu = menuItems.find((m) => m._id.toString() === item.menuItemId);

    return {
      menuItemId: menu._id,
      name: menu.name,
      price: Number(menu.price),
      quantity: Number(item.quantity),
      specialInstructions: item.specialInstructions || "",
    };
  });
};

export const calculateTotals = (items, orderType) => {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const tax = subtotal * 0.1;
  const deliveryFee = orderType === "delivery" ? 50 : 0;

  return {
    subtotal,
    tax,
    deliveryFee,
    total: subtotal + tax + deliveryFee,
  };
};
