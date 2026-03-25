import mongoose from "mongoose";

export const validateCreateOrder = (body) => {
  const { restaurantId, items, orderType, deliveryAddress, tableNumber } = body;

  if (!restaurantId) throw new Error("restaurantId is required");

  if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
    throw new Error("Invalid restaurantId");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Order items required");
  }

  if (!["delivery", "dine-in"].includes(orderType)) {
    throw new Error("Invalid orderType");
  }

  // ✅ delivery validation
  if (orderType === "delivery") {
    if (!deliveryAddress) {
      throw new Error("Delivery address required");
    }
  }

  // ✅ dine-in validation
  if (orderType === "dine-in") {
    if (!tableNumber) {
      throw new Error("Table number required");
    }
  }

  // ✅ items validation
  items.forEach((item) => {
    if (!item.menuItemId) {
      throw new Error("menuItemId required");
    }

    if (!mongoose.Types.ObjectId.isValid(item.menuItemId)) {
      throw new Error(`Invalid menuItemId: ${item.menuItemId}`);
    }

    if (!item.quantity || item.quantity <= 0) {
      throw new Error("Invalid quantity");
    }
  });
};
