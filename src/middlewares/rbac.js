export const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Access denied",
      });
    }

    next();
  };
};
export const isResourceOwner = (model, paramIdField = "id") => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const resourceId = req.params[paramIdField];

      const resource = await model.findById(resourceId).lean();

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: "Resource not found",
        });
      }

      // ✅ Admin bypass
      if (req.user.role === "admin") return next();

      // 🔥 FIX: use req.user.id (not userId)
      if (
        req.user.role === "owner" &&
        resource.ownerId?.toString() === req.user.id
      ) {
        return next();
      }

      // ✅ Optional (only if you really have these roles)
      if (
        ["manager", "staff"].includes(req.user.role) &&
        req.user.restaurantIds?.includes(resource.restaurantId?.toString())
      ) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    } catch (err) {
      console.error("Ownership Error:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };
};
