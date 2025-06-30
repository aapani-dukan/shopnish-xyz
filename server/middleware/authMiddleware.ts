// server/middleware/authMiddleware.ts
import { Response, NextFunction } from 'express';
import { verifyToken, AuthenticatedRequest } from './verifyToken.js'; // Import verifyToken and AuthenticatedRequest
import { userRoleEnum } from '@/shared/backend/schema.js'; // Import userRoleEnum

// Middleware for general authentication
export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  verifyToken(req, res, next); // Simply passes control to verifyToken
};

// Middleware for requiring Admin role
export const requireAdminAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  verifyToken(req, res, () => {
    // After token is verified and req.user is populated
    if (req.user && req.user.role === userRoleEnum.enumValues[2]) { // Assuming 'admin' is the 3rd enum value (index 2)
      next();
    } else {
      res.status(403).json({ message: 'Forbidden: Admin access required.' });
    }
  });
};

// Middleware for requiring Seller role
export const requireSellerAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  verifyToken(req, res, () => {
    // After token is verified and req.user is populated
    if (req.user && req.user.role === userRoleEnum.enumValues[1]) { // Assuming 'seller' is the 2nd enum value (index 1)
      next();
    } else {
      res.status(403).json({ message: 'Forbidden: Seller access required.' });
    }
  });
};

// Middleware for requiring Delivery Boy role
export const requireDeliveryBoyAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  verifyToken(req, res, () => {
    // After token is verified and req.user is populated
    if (req.user && req.user.role === userRoleEnum.enumValues[3]) { // Assuming 'delivery_boy' is the 4th enum value (index 3)
      next();
    } else {
      res.status(403).json({ message: 'Forbidden: Delivery Boy access required.' });
    }
  });
};
