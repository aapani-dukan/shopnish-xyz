// server/middleware/requireAdminAuth.ts
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './verifyToken'; // AuthenticatedRequest को यहीं से इम्पोर्ट करें

export function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // पहले यह जांचें कि उपयोगकर्ता प्रमाणित है या नहीं।
  // यह req.user ऑब्जेक्ट के उपलब्ध होने की पुष्टि करता है।
  if (!req.user || !req.user.id) {
    // यदि प्रमाणित नहीं है, तो 401 Unauthorized भेजें।
    return res.status(401).json({ message: 'Unauthorized: Authentication required.' });
  }

  // अब, जांचें कि क्या उपयोगकर्ता के पास 'admin' की भूमिका है।
  // मान लें कि req.user.role आपके JWT या उपयोगकर्ता ऑब्जेक्ट में उपलब्ध है।
  if (req.user.role !== 'admin') {
    // यदि भूमिका 'admin' नहीं है, तो 403 Forbidden भेजें।
    return res.status(403).json({ message: 'Forbidden: Admin access required.' });
  }

  // यदि उपयोगकर्ता प्रमाणित है और उसके पास 'admin' की भूमिका है, तो अगले मिडलवेयर/रूट हैंडलर पर जाएं।
  next();
}
