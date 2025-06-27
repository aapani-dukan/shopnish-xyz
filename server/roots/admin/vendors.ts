// server/roots/admin/vendors.ts (नई फाइल बनाएँ)

import express from 'express';
import { storage } from '../../storage'; // storage.ts से इंपोर्ट करें

const router = express.Router();

// GET /api/admin/vendors
router.get('/', async (req, res) => { // रूट सिर्फ '/' है क्योंकि यह /api/admin/vendors पर माउंट होगा
  try {
    // getSellers को बिना किसी फिल्टर के कॉल करें ताकि सभी वेंडर्स मिलें (pending, approved, rejected)
    const vendors = await storage.getSellers(); // storage से getSellers फंक्शन कॉल करें
    
console.log("Fetched Vendors:", vendors); // ✅ log to confirm
    return res.status(200).json({ success: true, data: vendors });
  } catch (error) {
    console.error('Error fetching admin vendors:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch vendors.' });
  }
});

// आपको यहां /api/admin/approve-vendor/:id और /api/admin/reject-vendor/:id भी जोड़ना होगा
// अगर वे अलग राउटर्स में नहीं हैं और आप admin-dashboard से ही उन्हें मैनेज करना चाहते हैं।
// उदाहरण के लिए:

router.post('/approve-vendor/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await storage.updateSellerStatus(id, 'approved'); // सुनिश्चित करें कि storage.ts में यह फंक्शन है
    return res.status(200).json({ success: true, message: 'Vendor approved.' });
  } catch (error) {
    console.error('Error approving vendor:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve vendor.' });
  }
});

router.post('/reject-vendor/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await storage.updateSellerStatus(id, 'rejected'); // सुनिश्चित करें कि storage.ts में यह फंक्शन है
    return res.status(200).json({ success: true, message: 'Vendor rejected.' });
  } catch (error) {
    console.error('Error rejecting vendor:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject vendor.' });
  }
});


export default router;
