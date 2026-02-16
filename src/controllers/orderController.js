import Order from "../models/Order.js";
import MenuItem from "../models/Menu.js";
import Restaurant from "../models/Restaurant.js";
import mongoose from "mongoose";
import { sendEmail } from "../utils/EmailNotification.js";
//import { sendSMS } from "../utils/Sms.js";
import { generateOrderEmailHTML } from "../services/emailtemplet.js";
//import { generateOrderSMS } from "../services/smsTemplate.js";

const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD${timestamp}${random}`;
};

const calculateOrderTotal = (items, orderType) => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const tax = subtotal * 0.1;
  const deliveryFee = orderType === "delivery" ? 50 : 0;
  const total = subtotal + tax + deliveryFee;

  return { subtotal, tax, deliveryFee, total };
};

const validateOrderAccess = (user, order) => {
  if (user.role === "admin") return true;
  if (
    user.role === "owner" &&
    user.restaurantId?.toString() === order.restaurantId.toString()
  )
    return true;
  if (
    user.role === "staff" &&
    user.restaurantId?.toString() === order.restaurantId.toString()
  )
    return true;
  if (
    user.role === "customer" &&
    user._id.toString() === order.customerId.toString()
  )
    return true;
  return false;
};

export const createOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { restaurantId, orderType, items, deliveryAddress, tableNumber } =
      req.body;

    if (!req.user || !req.user._id) {
      await session.abortTransaction();
      session.endSession();
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!restaurantId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "restaurantId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Invalid restaurantId" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Order items required" });
    }

    if (!orderType) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "orderType is required" });
    }

    if (orderType === "delivery" && !deliveryAddress) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Delivery address required" });
    }

    if (orderType === "dine-in" && !tableNumber) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Table number required" });
    }

    const restaurant = await Restaurant.findById(restaurantId).session(session);
    if (!restaurant) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "Restaurant not found" });
    }

    const menuItemIds = [];
    for (const item of items) {
      if (!item.menuItemId) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ error: "menuItemId required for all items" });
      }
      if (!mongoose.Types.ObjectId.isValid(item.menuItemId)) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ error: `Invalid menuItemId: ${item.menuItemId}` });
      }
      if (!item.quantity || item.quantity <= 0) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ error: "Valid quantity required for all items" });
      }
      menuItemIds.push(new mongoose.Types.ObjectId(item.menuItemId));
    }

    const menuItems = await MenuItem.find({
      _id: { $in: menuItemIds },
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      isActive: true,
    }).session(session);

    if (menuItems.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        error: "No valid menu items found",
        message:
          "Check if menu items exist, are active, and belong to this restaurant",
      });
    }

    if (menuItems.length !== menuItemIds.length) {
      const foundIds = menuItems.map((m) => m._id.toString());
      const missingIds = menuItemIds.filter(
        (id) => !foundIds.includes(id.toString()),
      );
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        error: "Some menu items not found or inactive",
        missing: missingIds,
      });
    }

    const orderItems = [];
    for (const item of items) {
      const menuItem = menuItems.find(
        (m) => m._id.toString() === item.menuItemId.toString(),
      );
      if (!menuItem) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ error: `Menu item not found: ${item.menuItemId}` });
      }
      if (!menuItem.name || !menuItem.price) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ error: `Invalid menu item data for: ${item.menuItemId}` });
      }
      orderItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: Number(menuItem.price),
        quantity: Number(item.quantity),
        specialInstructions: item.specialInstructions || "",
      });
    }

    const totals = calculateOrderTotal(orderItems, orderType);

    const orderData = {
      orderNumber: generateOrderNumber(),
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      customerId: new mongoose.Types.ObjectId(req.user._id),
      orderType: orderType,
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

    if (orderType === "delivery" && deliveryAddress) {
      orderData.deliveryAddress = {
        street: deliveryAddress.street || "",
        city: deliveryAddress.city || "",
        state: deliveryAddress.state || "",
        zipCode: deliveryAddress.zipCode || "",
        phone: deliveryAddress.phone || "",
        instructions: deliveryAddress.instructions || "",
      };
    }

    if (orderType === "dine-in" && tableNumber) {
      orderData.tableNumber = String(tableNumber);
    }

    const order = new Order(orderData);
    await order.validate();
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    await order.populate([
      { path: "restaurantId", select: "name address phone" },
      { path: "customerId", select: "name email phone" },
    ]);

    const itemsString = order.items
      .map((i) => `${i.name} x${i.quantity}`)
      .join(", ");
    const templateData = {
      name: order.customerId.name,
      orderId: order.orderNumber,
      items: itemsString,
      total: order.total.toFixed(2),
      eta: 30,
    };
    if (order.customerId?.email) {
      sendEmail(
        order.customerId.email,
        `Order Confirmed #${order.orderNumber}`,
        templateData,
      ).catch((err) => console.error("Email send failed:", err));
    }
    res.status(201).json(order);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Create Order Error:", err);
    next(err);
  }
};
export const getAllOrders = async (req, res, next) => {
  try {
    const { status, orderType, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const filter = { isActive: true };

    if (req.user.role === "customer") {
      filter.customerId = req.user._id;
    } else if (req.user.role === "owner" || req.user.role === "staff") {
      filter.restaurantId = req.user.restaurantId;
    }

    if (status) {
      filter.status = status;
    }
    if (orderType) {
      filter.orderType = orderType;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("restaurantId", "name address")
        .populate("customerId", "name email phone")
        .populate("assignedTo", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(filter),
    ]);

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
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

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

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
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (req.user.role === "customer") {
      if (status !== "cancelled" || order.status !== "pending") {
        return res.status(403).json({ error: "Cannot update order status" });
      }
    } else if (req.user.role === "staff" || req.user.role === "owner") {
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
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (
      req.user.role !== "admin" &&
      req.user.role !== "owner" &&
      req.user.restaurantId?.toString() !== order.restaurantId.toString()
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    order.assignedTo = staffId;
    order.statusHistory.push({
      status: order.status,
      updatedBy: req.user._id,
      timestamp: new Date(),
      note: `Assigned to staff`,
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

    if (req.user.role === "owner" || req.user.role === "staff") {
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
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
    });

    res.json({ stats, todayOrders });
  } catch (err) {
    next(err);
  }
};
