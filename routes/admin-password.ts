// routes/admin-password.ts

import { Router, Request, Response } from "express";

const router = Router();

// 🛡️ Hardcoded admin password (बाद में .env में डाल सकते हैं)
const ADMIN_PASSWORD = "shivraj@5240";

router.post("/", async (req: Request, res: Response) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: "Password is required." });
  }

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Invalid admin password." });
  }

  // ✅ Password correct है
  return res.status(200).json({ message: "Admin login successful." });
});

export default router;
