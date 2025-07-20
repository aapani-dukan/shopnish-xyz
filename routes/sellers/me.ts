// routes/sellers/me.ts
import { verifyToken } from "../../server/middleware/verifyToken.ts";
import { sql } from "../.../server/db.ts";

export default async function handler(req, res) {
  const user = await verifyToken(req, res);
  if (!user) return;

  const { firebase_uid } = user;

  const result = await sql`
    SELECT * FROM sellers WHERE firebase_uid = ${firebase_uid}
  `;

  if (result.length === 0) {
    return res.status(200).json({ seller: null });
  }

  return res.status(200).json({ seller: result[0] });
}
