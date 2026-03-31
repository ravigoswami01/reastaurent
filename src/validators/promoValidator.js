
export const validateCreatePromo = (req, res, next) => {
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

        // 🔴 Required fields
        if (!code || !discountType || discountValue === undefined || !expiryDate) {
            return res.status(400).json({
                message: "code, discountType, discountValue, expiryDate are required",
            });
        }

        // 🔴 Code format
        if (typeof code !== "string" || code.trim().length < 3) {
            return res.status(400).json({
                message: "Promo code must be at least 3 characters",
            });
        }

        // 🔴 Discount type
        if (!["percentage", "fixed"].includes(discountType)) {
            return res.status(400).json({
                message: "discountType must be 'percentage' or 'fixed'",
            });
        }

        // 🔴 Discount value
        if (typeof discountValue !== "number" || discountValue <= 0) {
            return res.status(400).json({
                message: "discountValue must be a positive number",
            });
        }

        // 🔴 Percentage rule
        if (discountType === "percentage" && discountValue > 100) {
            return res.status(400).json({
                message: "Percentage cannot exceed 100",
            });
        }

        // 🔴 Min order
        if (minOrderAmount && minOrderAmount < 0) {
            return res.status(400).json({
                message: "minOrderAmount cannot be negative",
            });
        }

        // 🔴 Max discount (only for %)
        if (discountType === "percentage" && maxDiscount && maxDiscount <= 0) {
            return res.status(400).json({
                message: "maxDiscount must be positive",
            });
        }

        // 🔴 Expiry date
        if (new Date(expiryDate) <= new Date()) {
            return res.status(400).json({
                message: "expiryDate must be in the future",
            });
        }

        // 🔴 Usage limit
        if (usageLimit && usageLimit <= 0) {
            return res.status(400).json({
                message: "usageLimit must be positive",
            });
        }

        next(); // ✅ pass to controller
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};