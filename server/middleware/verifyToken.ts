// server/middleware/verifyToken.ts
import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db'; // Assuming db is relative
import { users } from '@/shared/backend/schema';
import { eq } from 'drizzle-orm';
import { AuthenticatedUser } from '@/shared/types/auth'; // Ensure this path is correct
import { storage } from '../storage'; // Assuming storage is relative

// Define AuthenticatedRequest interface
export interface AuthenticatedRequest extends Request { // EXPORT AuthenticatedRequest
  user?: AuthenticatedUser;
}

export const verifyToken = async (req: AuthenticatedRequest, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1]; // Bearer TOKEN
  if (!token) {
    return res.status(401).json({ message: 'Token not found' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret') as AuthenticatedUser;
    
    // Fetch the user from the database to ensure their existence and get updated role/status
    const [userRecord] = await storage.getUserByFirebaseUid(decoded.firebaseUid); // Corrected method name

    if (!userRecord) {
      return res.status(401).json({ message: 'User not found in database' });
    }

    req.user = {
      id: userRecord.id,
      firebaseUid: userRecord.firebaseUid,
      email: userRecord.email,
      role: userRecord.role,
      approvalStatus: userRecord.approvalStatus,
      // Add other properties if needed
    };
    next();
  } catch (error: any) {
    console.error('Token verification failed:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(401).json({ message: 'Invalid token' });
  }
};
