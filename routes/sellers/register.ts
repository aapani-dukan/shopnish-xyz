// routes/sellers/register.ts
import { verifyToken } from "../../server/middleware/verifyToken.ts";
import { sql } from "../../server/db.ts";

export default async function handler(req, res) {
  const user = await verifyToken(req, res);
  if (!user) return;

  const {
    full_name,
    business_name,
    shop_address,
    city,
    phone_number,
    shop_category,
  } = req.body;

  if (!full_name || !business_name || !shop_address || !city || !phone_number || !shop_category) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const result = await sql`
      INSERT INTO sellers (firebase_uid, full_name, business_name, shop_address, city, phone_number, shop_category, email, approval_status)
      VALUES (
        ${user.firebase_uid},
        ${full_name},
        ${business_name},
        ${shop_address},
        ${city},
        ${phone_number},
        ${shop_category},
        ${user.email},
        'pending'
      )
      RETURNING *
    `;

    return res.status(201).json({ success: true, seller: result[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Seller already exists" });
    }
    return res.status(500).json({ error: "Registration failed" });
  }
}
