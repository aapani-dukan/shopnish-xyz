// shopnish-xyz/routes/dBoyRoutes.ts

import { Router, Request, Response } from 'express';
import { db } from '../server/db.ts';
import { deliveryBoys, approvalStatusEnum } from '../shared/backend/schema.ts';
import { eq } from 'drizzle-orm';

const router = Router();

// ✅ नया रजिस्ट्रेशन राउट
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, firebaseUid, name, vehicleType } = req.body;

    // पहले से मौजूद यूजर की जाँच करें
    const existingDeliveryBoy = await db.query.deliveryBoys.findFirst({
      where: eq(deliveryBoys.email, email),
    });

    if (existingDeliveryBoy) {
      return res.status(409).json({ message: "A user with this email is already registered." });
    }

    // डेटाबेस में नया रिकॉर्ड डालें
    const [newDeliveryBoy] = await db.insert(deliveryBoys).values({
      firebaseUid: firebaseUid,
      email,
      name: name || 'Delivery Boy',
      vehicleType,
      approvalStatus: 'pending', // ✅ यहाँ 'pending' का उपयोग करें
    }).returning();

    res.status(201).json(newDeliveryBoy);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
