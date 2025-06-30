// shared/types/auth.ts
import { z } from "zod";
import { Request } from 'express';
import { userRoleEnum, approvalStatusEnum } from '@/shared/backend/schema'; // Drizzle enums को इम्पोर्ट करें

export interface AuthenticatedUser {
  id: number; // users table id
  firebaseUid: string;
  email: string;
  role: z.infer<typeof userRoleEnum>; // Zod enum type from Drizzle pgEnum
  approvalStatus: z.infer<typeof approvalStatusEnum>; // Zod enum type from Drizzle pgEnum
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
