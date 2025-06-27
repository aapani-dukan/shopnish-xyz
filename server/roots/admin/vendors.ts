// server/roots/admin/vendors.ts

import express from 'express';
import { storage } from '../../storage'; // storage.ts से इंपोर्ट करें
import { requireAdminAuth } from '../../middleware/requireAdminAuth'; // ✅ नया: एडमिन ऑथेंटिकेशन मिडलवेयर

const router = express.Router();

// ✅ सभी एडमिन रूट्स पर requireAdminAuth मिडलवेयर लागू करें।
// यह सुनिश्चित करता है कि इन रूट्स तक केवल प्रमाणित और 'admin' भूमिका वाले यूज़र ही पहुँच सकें।
router.use(requireAdminAuth);

// GET /api/admin/vendors
// सभी वेंडर्स को प्राप्त करें (pending, approved, rejected)
router.get('/', async (req, res) => {
  try {
    const vendors = await storage.getSellers(); 
    
    console.log("Fetched Vendors:", vendors);
    return res.status(200).json({ success: true, data: vendors });
  } catch (error) {
    console.error('Error fetching admin vendors:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch vendors.' });
  }
});

// POST /api/admin/vendors/approve-vendor/:id
// एक विक्रेता को 'approved' स्थिति में अपडेट करें
router.post('/approve-vendor/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = parseInt(id, 10); // ✅ स्ट्रिंग ID को पूर्णांक में बदलें

    if (isNaN(sellerId)) {
        return res.status(400).json({ success: false, message: 'Invalid seller ID provided.' });
    }

    await storage.updateSellerStatus(sellerId, 'approved'); // storage.ts में इस फ़ंक्शन को अपडेट करें
    
    return res.status(200).json({ success: true, message: 'Vendor approved successfully.' });
  } catch (error) {
    console.error('Error approving vendor:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve vendor.' });
  }
});

// POST /api/admin/vendors/reject-vendor/:id
// एक विक्रेता को 'rejected' स्थिति में अपडेट करें
router.post('/reject-vendor/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = parseInt(id, 10); // ✅ स्ट्रिंग ID को पूर्णांक में बदलें

    if (isNaN(sellerId)) {
        return res.status(400).json({ success: false, message: 'Invalid seller ID provided.' });
    }

    await storage.updateSellerStatus(sellerId, 'rejected'); // storage.ts में इस फ़ंक्शन को अपडेट करें
    
    return res.status(200).json({ success: true, message: 'Vendor rejected successfully.' });
  } catch (error) {
    console.error('Error rejecting vendor:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject vendor.' });
  }
});

export default router;
