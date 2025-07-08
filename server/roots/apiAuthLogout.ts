// server/routes/apiAuthLogout.ts

import { Router, Response } from 'express';
const router = Router();

router.post('/logout', (_, res: Response) => {
  res.clearCookie('__session', { path: '/' });
  res.status(200).json({ message: 'Logged out successfully' });
});

export default router;
