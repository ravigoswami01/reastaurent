import mongoose from "mongoose";

const { Schema, model } = mongoose;

const MENU_CATEGORIES = [
  "Burgers & Fries",
  "Pizza",
  "Sandwiches & Wraps",
  "Fried & Crispy",
  "main",
];

const menuItemSchema = new Schema(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [120, "Name must be at most 120 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be >= 0"],
      set: (v) => Math.round(v * 100) / 100,
    },

    category: {
      type: String,
      enum: MENU_CATEGORIES,
      default: "main",
      index: true,
    },

    imageUrl: {
      type: String,
      trim: true,
      default: "",
    },

    imagePublicId: {
      type: String,
      trim: true,
      default: "",
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

menuItemSchema.index({ name: "text", description: "text" });
menuItemSchema.index({ restaurantId: 1, category: 1, isActive: 1 });

const MenuItem = model("MenuItem", menuItemSchema);

export default MenuItem;
