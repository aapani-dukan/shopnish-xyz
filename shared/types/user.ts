// shared/types/user.ts 

import { z } from "zod"; // यदि आप Zod enums से टाइप इनफर कर रहे हैं
import { userRoleEnum, approvalStatusEnum } from '@/shared/backend/schema'; // Drizzle enums को इम्पोर्ट करें

export interface User {
  // आपकी यूजर टेबल में uuid कॉलम firebaseUid को स्टोर करता है
  uuid: string; // Firebase UID / प्राइमरी यूजर आइडेंटिफायर

  // अन्य फ़ील्ड्स जो आपके बैकएंड के user ऑब्जेक्ट में हैं
  email: string;
  name?: string | null; // यदि बैकएंड से आ रहा है
  role: z.infer<typeof userRoleEnum>; // यूजर की भूमिका
  
  // यदि यूजर एक विक्रेता है और आप उसके विवरण भी भेज रहे हैं
  seller?: {
    approvalStatus: z.infer<typeof approvalStatusEnum>;
    // यहां अन्य विक्रेता-विशिष्ट फ़ील्ड्स जोड़ें यदि वे भी भेजे जा रहे हैं
  } | null;

  // यदि आपके यूजर ऑब्जेक्ट में कोई अन्य प्रॉपर्टीज हैं तो उन्हें यहां जोड़ें
  // जैसे: firstName?: string; lastName?: string; phone?: string; आदि।
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  pincode?: string;
  isActive?: boolean;
  createdAt?: string; // या Date यदि आप इसे Date ऑब्जेक्ट के रूप में हैंडल करते हैं
  updatedAt?: string; // या Date
}

// यदि आपके पास AuthenticatedUser इंटरफ़ेस है, तो उसे भी अपडेट करें
// shared/types/auth.ts
// export interface AuthenticatedUser {
//   id: number; // यदि आपके DB में आंतरिक ID है
//   uuid: string; // Firebase UID
//   email: string;
//   role: z.infer<typeof userRoleEnum>;
//   approvalStatus: z.infer<typeof approvalStatusEnum>;
//   // ... अन्य फ़ील्ड्स
// }
