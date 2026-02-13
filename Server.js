import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import connectDB from "./src/config/mongoDB.js";
import authRoutes from "./src/routes/authRoutes.js";
import restaurantRoutes from "./src/routes/restaurantRoutes.js";

// Load environment variables first
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/restaurants", restaurantRoutes);
// Start server
app.listen(PORT, () => {
  console.log(`Server is running on localhost:${PORT}`);
});
