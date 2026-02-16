import mongoose from "mongoose";

const { Schema, model } = mongoose;

const MENU_CATEGORIES = ["appetizer", "main", "dessert", "beverage"];

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
      trim: true,
      minlength: 2,
      maxlength: 120,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    price: {
      type: Number,
      required: true,
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

menuItemSchema.index({
  name: "text",
  description: "text",
});

menuItemSchema.index({
  restaurantId: 1,
  category: 1,
  isActive: 1,
});

menuItemSchema.set("toJSON", {
  transform: (_, ret) => {
    delete ret.__v;
    return ret;
  },
});

const MenuItem = model("MenuItem", menuItemSchema);

export default MenuItem;
