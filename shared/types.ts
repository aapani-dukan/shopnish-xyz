// shared/types.ts

import { Request } from "express";

// Allowed roles in system
export type UserRole = "customer" | "seller" | "admin" | "delivery";

// Authenticated user object
export interface AuthenticatedUser {
  userId: string;         // Firebase UID
  email?: string;
  name?: string;
  id?: number;            // Internal DB ID (like seller.id)
  role?: UserRole;
}

// Request with attached user
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
