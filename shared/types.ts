// shared/types.ts

import { Request } from "express";

// Authenticated user structure set by verifyToken
export interface AuthenticatedUser {
  userId: string;
  email: string;
  name?: string;
  role?: string;
}

// Extended request object to include `user`
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
