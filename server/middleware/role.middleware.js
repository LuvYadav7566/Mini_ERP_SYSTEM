export const checkRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, no user session' });
    }
    // Admin bypasses all checks (full access)
    if (req.user.role === 'Admin') {
      return next();
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: Access restricted for role '${req.user.role}'`,
      });
    }
    next();
  };
};
