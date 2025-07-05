// shared/types/user.ts

import { z } from "zod";

// ✅ यह सुनिश्चित करें कि आप 'userRoleEnum' और 'approvalStatusEnum' को सही जगह से इम्पोर्ट कर रहे हैं।
// आमतौर पर, ये आपके Drizzle स्कीमा फ़ाइल से या एक अलग Enum फ़ाइल से आते हैं।
// उदाहरण: import { userRoleEnum, approvalStatusEnum } from '@/backend/db/schema'; // <-- अपने वास्तविक पाथ को यहाँ अपडेट करें!
// यदि आप Enum को एक अलग फाइल में define कर रहे हैं: import { userRoleEnum, approvalStatusEnum } from './enums';
import { userRoleEnum, approvalStatusEnum } from '@/shared/backend/schema'; // <-- यहाँ अपना सही पाथ डालें!

/**
 * Represents the structure of a User object used throughout the frontend.
 * This type combines data from Firebase Authentication and your backend API.
 * It's crucial for managing user state and authentication tokens.
 */
export interface User {
  // ✅ Firebase UID: यह Firebase द्वारा प्रदान की गई अद्वितीय यूजर आईडी है।
  // यह आपके बैकएंड यूजर रिकॉर्ड से uuid को मैप करता है।
  firebaseUid: string; 

  // ✅ आपके बैकएंड डेटाबेस में यूजर का अद्वितीय पहचानकर्ता।
  // यह आमतौर पर `firebaseUid` के साथ मैप होता है या उस पर आधारित होता है।
  uuid: string; 

  // ✅ Firebase ID Token: यह टोकन Firebase द्वारा जारी किया जाता है
  // और आपके बैकएंड पर प्रमाणित API अनुरोधों के लिए उपयोग किया जाता है।
  idToken: string; 

  // --- Common User Details ---
  email: string;
  name?: string | null; // Optional: if displayName is sent and can be null

  // User's role, inferred from your Drizzle pgEnum
  role: z.infer<typeof userRoleEnum>;

  // --- Optional: Seller-specific details ---
  // Only present if the user's role is 'seller'.
  // This object contains details about their seller application status and other seller info.
  seller?: {
    approvalStatus: z.infer<typeof approvalStatusEnum>;
    // Add other seller-specific fields here if your backend sends them within this object
    // e.g., storeName?: string;
    // e.g., businessType?: string;
    // e.g., deliveryRadius?: number;
  } | null; // Can be null or undefined if not a seller
  
  // --- Other Top-Level User Properties (Optional) ---
  // Add any other user properties that your backend sends as part of the primary user object.
  // For example, if your /api/auth/login or /api/me endpoints send these fields.
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
