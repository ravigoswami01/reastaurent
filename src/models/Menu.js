import mongoose from "mongoose";
const { Schema, model } = mongoose;

export const MENU_CATEGORIES = ["burgers", "pizza", "salads", "pasta", "desserts", "drinks"];

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
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    description: {
      type: String,
      default: "",
      maxlength: 500,
    },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      default: null,
    },
    category: {
      type: String,
      enum: MENU_CATEGORIES,
      required: true,
      index: true,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    imagePublicId: {
      type: String,
      default: "",
    },
    tags: {
      type: [String],
      required: [true, "At least one tag is required"],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length >= 1,
        message: "tags must contain at least one value",
      },
    },
    prepTime: {
      type: Number,
      required: true,
      min: [1, "Prep time must be at least 1 minute"],
      default: 10,
    },
    calories: {
      type: Number,
      required: true,
      min: [0, "Calories cannot be negative"],
      default: 0,
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

export default model("MenuItem", menuItemSchema);