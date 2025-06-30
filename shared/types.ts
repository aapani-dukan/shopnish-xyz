// shared/types.ts

import { Request } from "express";

// Allowed roles in system
export type UserRole = "customer" | "seller" | "admin" | "delivery";

// Authenticated user object
export interface AuthenticatedUser {
  userId: string;
  email?: string;
  name?: string;
  id?: number;
  role?: UserRole;
}

// Extended request type with user
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
