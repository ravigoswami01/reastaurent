import mongoose from "mongoose";

const promoCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
    },
    discountType: {
        type: String,
        enum: ["percentage", "fixed"],
        required: true,
    },
    discountValue: {
        type: Number,
        required: true,
    },
    minOrderAmount: {
        type: Number,
        default: 0,
    },
    maxDiscount: {
        type: Number,
        default: 0,
    },
    expiryDate: {
        type: Date,
        required: true,
    },
    usageLimit: {
        type: Number,
    },
    usedCount: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    }
}, { timestamps: true });

export default mongoose.model("PromoCode", promoCodeSchema);