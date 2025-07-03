// shared/types/user.ts

import { z } from "zod"; // Zod को इम्पोर्ट करें यदि आप Drizzle pgEnum से टाइप इनफर कर रहे हैं

// यह सुनिश्चित करें कि आप 'userRoleEnum' और 'approvalStatusEnum' को सही जगह से इम्पोर्ट कर रहे हैं।
// आमतौर पर, ये आपके Drizzle स्कीमा फ़ाइल से या एक अलग Enum फ़ाइल से आते हैं।
// उदाहरण: import { userRoleEnum, approvalStatusEnum } from '@/shared/backend/schema';
// या: import { userRoleEnum, approvalStatusEnum } from './enums'; // यदि enums एक अलग फ़ाइल में हैं
import { userRoleEnum, approvalStatusEnum } from '@/shared/backend/schema'; // <-- अपने वास्तविक पाथ को यहाँ अपडेट करें!

/**
 * Represents the structure of a User object returned from the backend API.
 * This type should accurately reflect the data shape sent by your /api/auth/login
 * and /api/me endpoints.
 */
export interface User {
  // Primary identifier for the user, typically maps to Firebase UID
  uuid: string;

  // Common user details
  email: string;
  name?: string | null; // Optional: if displayName is sent and can be null

  // User's role, inferred from your Drizzle pgEnum
  role: z.infer<typeof userRoleEnum>;

  // Optional: Seller-specific details, only present if the user's role is 'seller'
  seller?: {
    approvalStatus: z.infer<typeof approvalStatusEnum>;
    // Add other seller-specific fields here if your backend sends them within this object
    // e.g., storeName?: string;
  } | null; // Can be null or undefined if not a seller
  
  // Add any other top-level user properties that your backend sends
  // For example, if your /me or login sends firstName, lastName, etc.
  // firstName?: string | null;
  // lastName?: string | null;
  // phone?: string | null;
  // address?: string | null;
  // city?: string | null;
  // pincode?: string | null;
  // isActive?: boolean;
  // createdAt?: string; // Or Date if you parse it as a Date object
  // updatedAt?: string; // Or Date
}

