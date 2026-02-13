import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true,
  },
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  category: {
    type: String,
    enum: ["appetizer", "main", "dessert", "beverage"],
  },
  imageUrl: String,
  isAvailable: { type: Boolean, default: true },
});

const MenuItem = mongoose.model("MenuItem", menuItemSchema);
export default MenuItem;
