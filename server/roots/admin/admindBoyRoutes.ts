// Server/roots/admin/admindBoyRoutes.ts

import { Router, Request, Response } from 'express';
import { db } from '../../db.ts';
import { deliveryBoys } from '../../../shared/backend/schema.ts';
import { eq, or } from 'drizzle-orm';

const router = Router();

// ---

// ✅ Get all Delivery Boys
// URL: /api/admin/delivery-boys/all
// यह सभी डिलीवरी बॉय की सूची देता है, चाहे उनका स्टेटस कुछ भी हो।
router.get('/all', async (req: Request, res: Response) => {
  try {
    const allDeliveryBoys = await db.query.deliveryBoys.findMany();
    res.status(200).json(allDeliveryBoys);
  } catch (error: any) {
    console.error("Failed to fetch all delivery boys:", error);
    res.status(500).json({ message: "Failed to fetch delivery boys." });
  }
});

// ---

// ✅ Get Pending Delivery Boy Applications
// URL: /api/admin/delivery-boys/pending-applications
// यह केवल उन डिलीवरी बॉय को फ़ेच करता है जिनका स्टेटस 'pending' है।
router.get('/pending-applications', async (req: Request, res: Response) => {
  try {
    const pendingApplications = await db.query.deliveryBoys.findMany({
      where: eq(deliveryBoys.approvalStatus, 'pending'),
    });
    res.status(200).json(pendingApplications);
  } catch (error: any) {
    console.error("Failed to fetch pending applications:", error);
    res.status(500).json({ message: "Failed to fetch pending applications." });
  }
});

// ---

// ✅ Approve a Delivery Boy
// URL: /api/admin/delivery-boys/approve/:id
// यह एक डिलीवरी बॉय के स्टेटस को 'approved' पर अपडेट करता है।
router.patch('/approve/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID provided." });
    }

    const [approvedBoy] = await db.update(deliveryBoys)
      .set({ approvalStatus: 'approved' })
      .where(eq(deliveryBoys.id, id))
      .returning();

    if (!approvedBoy) {
      return res.status(404).json({ message: "Delivery boy not found." });
    }

    res.status(200).json({
      message: "Delivery boy approved successfully.",
      user: approvedBoy,
    });
  } catch (error: any) {
    console.error("Failed to approve delivery boy:", error);
    res.status(500).json({ message: "Failed to approve delivery boy." });
  }
});

// ---

// ✅ Reject a Delivery Boy
// URL: /api/admin/delivery-boys/reject/:id
// यह एक डिलीवरी बॉय के स्टेटस को 'rejected' पर अपडेट करता है।
router.patch('/reject/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID provided." });
    }

    const [rejectedBoy] = await db.update(deliveryBoys)
      .set({ approvalStatus: 'rejected' })
      .where(eq(deliveryBoys.id, id))
      .returning();

    if (!rejectedBoy) {
      return res.status(404).json({ message: "Delivery boy not found." });
    }

    res.status(200).json({
      message: "Delivery boy rejected successfully.",
      user: rejectedBoy,
    });
  } catch (error: any) {
    console.error("Failed to reject delivery boy:", error);
    res.status(500).json({ message: "Failed to reject delivery boy." });
  }
});

export default router;
