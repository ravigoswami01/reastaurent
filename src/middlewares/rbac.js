export const allowRoles = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      if (!roles.includes(req.user.role)) {
        return res
          .status(403)
          .json({ error: "Forbidden: insufficient permissions" });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

export const isResourceOwner = (model, paramIdField = "id") => {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const resourceId = req.params[paramIdField];

      const resource = await model.findById(resourceId);

      if (!resource)
        return res.status(404).json({ error: "Resource not found" });

      // Admin bypass
      if (req.user.role === "admin") return next();

      // Owner check
      if (
        req.user.role === "owner" &&
        resource.ownerId &&
        resource.ownerId.toString() === String(req.user.userId)
      ) {
        return next();
      }

      // Staff check
      if (
        req.user.role === "staff" &&
        resource.restaurantId &&
        resource.restaurantId.toString() === String(req.user.restaurantId)
      ) {
        return next();
      }

      return res.status(403).json({ error: "Forbidden" });
    } catch (err) {
      next(err);
    }
  };
};
