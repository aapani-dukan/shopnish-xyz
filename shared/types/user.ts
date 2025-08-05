// shared/types/user.ts

import { z } from "zod";
import { userRoleEnum, approvalStatusEnum } from '../backend/schema.ts';

export interface User {
  // ✅ Firebase UID: अब यही एकमात्र यूजर ID है
  firebaseUid: string; 

  // ❌ यह लाइन हटा दें, क्योंकि यह अब firebaseUid के समान है
  // uuid: string; 

  // ✅ Firebase ID Token
  idToken: string; 

  // --- Common User Details ---
  email: string;
  name?: string | null;

  role: z.infer<typeof userRoleEnum>;

  // --- Optional: Seller-specific details ---
  seller?: {
    approvalStatus: z.infer<typeof approvalStatusEnum>;
  } | null;
}
