import express from "express";
import { storage } from "../../storage";

const router = express.Router();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

router.post("/", async (req, res) => {
  const { firebaseUid, password } = req.body;

  if (!firebaseUid || !password) {
    return res.status(400).json({ message: "Missing UID or password." });
  }

  try {
    // ✅ Firebase UID से user खोजें
    let user = await storage.getUserByFirebaseUid(firebaseUid);

    // ✅ अगर user नहीं मिला, तो बनाओ admin के रूप में
    if (!user) {
      user = await storage.createUser({
        firebaseUid,
        email: `admin@auto.com`, // या client से भेजी गई email हो तो बेहतर
        name: "Admin",
        role: "admin",
        approvalStatus: "approved"
      });
      console.log("✅ Admin user created.");
    }

    // ✅ role check
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Not an admin user." });
    }

    // ✅ password check
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ message: "Invalid admin password." });
    }

    res.json({ message: "Admin login success." });
  } catch (err) {
    console.error("Error in admin login:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

export default router;
