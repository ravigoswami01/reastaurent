import mongoose from "mongoose";
import Order from "../models/Order.js";
import MenuItem from "../models/Menu.js";
import Restaurant from "../models/Restaurant.js";
import { sendEmail } from "../utils/EmailNotification.js";
import { generateOrderNumber } from "../utils/order.utils.js";
import { abortTransaction } from "../utils/transaction.js";

const calculateTotals = (items, orderType) => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const tax = subtotal * 0.1;
  const deliveryFee = orderType === "delivery" ? 50 : 0;

  return {
    subtotal,
    tax,
    deliveryFee,
    total: subtotal + tax + deliveryFee,
  };
};

export const createOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { restaurantId, orderType, items, deliveryAddress, tableNumber } =
      req.body;

    if (!req.user?._id) throw new Error("Authentication required");

    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      throw new Error("Invalid restaurantId");
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Order items required");
    }

    if (!["delivery", "dine-in"].includes(orderType)) {
      throw new Error("Invalid orderType");
    }

    if (orderType === "delivery" && !deliveryAddress) {
      throw new Error("Delivery address required");
    }

    if (orderType === "dine-in" && !tableNumber) {
      throw new Error("Table number required");
    }

    const restaurant = await Restaurant.findById(restaurantId).session(session);
    if (!restaurant) throw new Error("Restaurant not found");

    const menuItemIds = items.map((i) => {
      if (!i.menuItemId) throw new Error("menuItemId required");

      if (!mongoose.Types.ObjectId.isValid(i.menuItemId)) {
        throw new Error(`Invalid menuItemId: ${i.menuItemId}`);
      }

      if (!i.quantity || i.quantity <= 0) {
        throw new Error("Invalid quantity");
      }

      return new mongoose.Types.ObjectId(i.menuItemId);
    });

    const menuItems = await MenuItem.find({
      _id: { $in: menuItemIds },
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      isActive: true,
    }).session(session);

    if (menuItems.length !== menuItemIds.length) {
      throw new Error("Some menu items not found or inactive");
    }

    const orderItems = items.map((item) => {
      const menu = menuItems.find(
        (m) => m._id.toString() === item.menuItemId.toString(),
      );

      if (!menu) throw new Error(`Menu item not found: ${item.menuItemId}`);

      return {
        menuItemId: menu._id,
        name: menu.name,
        price: Number(menu.price),
        quantity: Number(item.quantity),
        specialInstructions: item.specialInstructions || "",
      };
    });

    const totals = calculateTotals(orderItems, orderType);

    const orderData = {
      orderNumber: generateOrderNumber(),
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      customerId: new mongoose.Types.ObjectId(req.user._id),
      orderType,
      items: orderItems,
      subtotal: Number(totals.subtotal.toFixed(2)),
      tax: Number(totals.tax.toFixed(2)),
      deliveryFee: Number(totals.deliveryFee.toFixed(2)),
      total: Number(totals.total.toFixed(2)),
      status: "pending",
      paymentStatus: "pending",
      isActive: true,
      statusHistory: [
        {
          status: "pending",
          updatedBy: new mongoose.Types.ObjectId(req.user._id),
          timestamp: new Date(),
          note: "Order created",
        },
      ],
    };

    if (orderType === "delivery") {
      orderData.deliveryAddress = {
        street: deliveryAddress?.street || "",
        city: deliveryAddress?.city || "",
        state: deliveryAddress?.state || "",
        zipCode: deliveryAddress?.zipCode || "",
        phone: deliveryAddress?.phone || "",
        instructions: deliveryAddress?.instructions || "",
      };
    }

    if (orderType === "dine-in") {
      orderData.tableNumber = String(tableNumber);
    }

    const [order] = await Order.create([orderData], { session });

    await session.commitTransaction();
    session.endSession();

    const populatedOrder = await Order.findById(order._id)
      .populate("restaurantId", "name address phone")
      .populate("customerId", "name email phone");

    if (populatedOrder?.customerId?.email) {
      const itemsString = populatedOrder.items
        .map((i) => `${i.name} x${i.quantity}`)
        .join(", ");

      sendEmail(
        populatedOrder.customerId.email,
        `Order Confirmed #${populatedOrder.orderNumber}`,
        {
          name: populatedOrder.customerId.name,
          orderId: populatedOrder.orderNumber,
          items: itemsString,
          total: populatedOrder.total.toFixed(2),
          eta: 30,
        },
      ).catch(() => {});
    }

    res.status(201).json(populatedOrder);
  } catch (err) {
    await abortTransaction(session);
    next(err);
  }
};

export const getAllOrders = async (req, res, next) => {
  try {
    const { status, orderType, page = 1, limit = 20 } = req.query;

    const filter = { isActive: true };

    if (req.user.role === "customer") {
      filter.customerId = req.user._id;
    }

    if (["owner", "staff"].includes(req.user.role)) {
      filter.restaurantId = req.user.restaurantId;
    }

    if (status) filter.status = status;
    if (orderType) filter.orderType = orderType;

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("restaurantId", "name address")
        .populate("customerId", "name email phone")
        .populate("assignedTo", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(filter),
    ]);

    res.json({
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("restaurantId", "name address phone")
      .populate("customerId", "name email phone")
      .populate("assignedTo", "name role")
      .populate("statusHistory.updatedBy", "name role");

    if (!order) return res.status(404).json({ error: "Order not found" });

    if (!validateOrderAccess(req.user, order)) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (req.user.role === "customer") {
      if (status !== "cancelled" || order.status !== "pending") {
        return res.status(403).json({ error: "Cannot update order status" });
      }
    }

    if (["staff", "owner"].includes(req.user.role)) {
      if (req.user.restaurantId?.toString() !== order.restaurantId.toString()) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const validTransitions = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["preparing", "cancelled"],
      preparing: ["ready", "cancelled"],
      ready: ["out-for-delivery", "completed"],
      "out-for-delivery": ["delivered"],
      delivered: ["completed"],
    };

    if (!validTransitions[order.status]?.includes(status)) {
      return res.status(400).json({ error: "Invalid status transition" });
    }

    order.status = status;

    order.statusHistory.push({
      status,
      updatedBy: req.user._id,
      timestamp: new Date(),
      note: note || "",
    });

    if (status === "delivered") {
      order.actualDeliveryTime = new Date();
    }

    await order.save();

    await order.populate([
      { path: "restaurantId", select: "name" },
      { path: "customerId", select: "name email" },
    ]);

    res.json(order);
  } catch (err) {
    next(err);
  }
};

export const assignOrder = async (req, res, next) => {
  try {
    const { staffId } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (
      !["admin", "owner"].includes(req.user.role) &&
      req.user.restaurantId?.toString() !== order.restaurantId.toString()
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    order.assignedTo = staffId;

    order.statusHistory.push({
      status: order.status,
      updatedBy: req.user._id,
      timestamp: new Date(),
      note: "Assigned to staff",
    });

    await order.save();

    res.json(order);
  } catch (err) {
    next(err);
  }
};

export const getOrderStats = async (req, res, next) => {
  try {
    const filter = { isActive: true };

    if (["owner", "staff"].includes(req.user.role)) {
      filter.restaurantId = req.user.restaurantId;
    }

    const stats = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalRevenue: { $sum: "$total" },
        },
      },
    ]);

    const todayOrders = await Order.countDocuments({
      ...filter,
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    });

    res.json({ stats, todayOrders });
  } catch (err) {
    next(err);
  }
};
