// server/middleware/authMiddleware.ts
import { Response, NextFunction } from 'express';
import { verifyToken, AuthenticatedRequest } from './verifyToken.ts';
import { userRoleEnum } from '../../shared/backend/schema.ts';
// db और deliveryBoys स्कीमा की आवश्यकता नहीं है क्योंकि verifyToken उन्हें पहले ही फेच कर चुका है

// सामान्य प्रमाणीकरण के लिए मिडलवेयर।
// यह सुनिश्चित करता है कि उपयोगकर्ता प्रमाणित है।
export const requireAuth = [
  verifyToken, // ✅ verifyToken अब req.user में deliveryBoyId, role, approvalStatus जोड़ रहा है
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized: Authentication required.' });
    }
    next();
  },
];

// केवल Admin भूमिका वाले उपयोगकर्ताओं के लिए
export const requireAdminAuth = [
  ...requireAuth, // ✅ पहले सामान्य प्रमाणीकरण चलाएं
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== userRoleEnum.enumValues[0]) { // 'admin'
      return res.status(403).json({ message: 'Forbidden: Admin access required.' });
    }
    next();
  },
];

// केवल Seller भूमिका वाले उपयोगकर्ताओं के लिए
export const requireSellerAuth = [
  ...requireAuth, // ✅ पहले सामान्य प्रमाणीकरण चलाएं
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== userRoleEnum.enumValues[1]) { // 'seller'
      return res.status(403).json({ message: 'Forbidden: Seller access required.' });
    }
    next();
  },
];

// केवल Delivery Boy भूमिका वाले उपयोगकर्ताओं के लिए
export const requireDeliveryBoyAuth = [
  ...requireAuth, // ✅ पहले सामान्य प्रमाणीकरण चलाएं
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // सुनिश्चित करें कि उपयोगकर्ता delivery-boy है, अप्रूव्ड है, और उसकी deliveryBoyId है
    if (
      !req.user ||
      req.user.role !== userRoleEnum.enumValues[2] || // 'delivery-boy'
      req.user.approvalStatus !== 'approved' || // ✅ अप्रूवल स्टेटस की जाँच
      typeof req.user.deliveryBoyId !== 'number' // ✅ सुनिश्चित करें कि आंतरिक इंटीजर ID मौजूद है
    ) {
      return res.status(403).json({ message: 'Forbidden: Access denied for unapproved or incomplete delivery boy profile.' });
    }
    next();
  },
];
