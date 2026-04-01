import PromoCode from "../models/PromoCode.model.js";

export const applyPromo = async (req, res) => {
  try {
    const { code, cartTotal } = req.body;

    if (!code || !cartTotal) {
      return res.status(400).json({
        success: false,
        message: "Code and cartTotal required",
      });
    }

    const promo = await PromoCode.findOne({
      code: code.toUpperCase(),
    });

    if (!promo) {
      return res.status(400).json({
        success: false,
        message: "Invalid promo code",
      });
    }

    if (!promo.isActive) {
      return res.status(400).json({
        success: false,
        message: "Promo inactive",
      });
    }

    if (new Date() > promo.expiryDate) {
      return res.status(400).json({
        success: false,
        message: "Promo expired",
      });
    }

    if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
      return res.status(400).json({
        success: false,
        message: "Usage limit reached",
      });
    }

    if (cartTotal < promo.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order ₹${promo.minOrderAmount} required`,
      });
    }

    // ✅ SAFE NUMBER CONVERSION
    const total = Number(cartTotal);
    const value = Number(promo.discountValue);

    let discount = 0;

    if (promo.discountType === "percentage") {
      discount = (total * value) / 100;

      if (promo.maxDiscount) {
        discount = Math.min(discount, promo.maxDiscount);
      }
    } else {
      discount = value;
    }

    return res.json({
      success: true,
      code: promo.code,
      discount,
      finalTotal: total - discount,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const createPromo = async (req, res) => {
    try {
        const {
            code,
            discountType,
            discountValue,
            minOrderAmount,
            maxDiscount,
            expiryDate,
            usageLimit,
        } = req.body;

        const existing = await PromoCode.findOne({
            code: code.toUpperCase(),
        });

        if (existing) {
            return res.status(400).json({
                message: "Promo code already exists",
            });
        }

        const promo = await PromoCode.create({
            code: code.toUpperCase(),
            discountType,
            discountValue,
            minOrderAmount: minOrderAmount || 0,
            maxDiscount: discountType === "percentage" ? maxDiscount : null,
            expiryDate,
            usageLimit: usageLimit || null,
            usedCount: 0,
            isActive: true,
        });

        return res.status(201).json({
            success: true,
            message: "Promo code created successfully",
            promo,
        });

    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};