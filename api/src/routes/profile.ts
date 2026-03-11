import { Router, Request, Response } from 'express';
import { db, users } from '../../../lib/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const [user] = await db.select().from(users).where(eq(users.id, req.user!.user_id));
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    phoneNumber: user.phoneNumber,
    dateOfBirth: user.dateOfBirth,
    isAdmin: user.isAdmin,
  });
});

router.post('/complete-profile', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { name, phone_number, date_of_birth } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  if (!name.trim().includes(' ')) {
    res.status(400).json({ error: 'Please enter your full name' });
    return;
  }

  // phone_number: optional, digits only, 7–15 chars
  if (phone_number !== undefined) {
    if (typeof phone_number !== 'string' || !/^\+\d{7,15}$/.test(phone_number)) {
      res.status(400).json({ error: 'phone_number must be in E.164 format (e.g. +919876543210)' });
      return;
    }
  }

  // date_of_birth: optional, valid ISO date, user must be ≥ 13 years old
  if (date_of_birth !== undefined) {
    const dob = new Date(date_of_birth);
    if (isNaN(dob.getTime())) {
      res.status(400).json({ error: 'date_of_birth must be a valid ISO date' });
      return;
    }
    const minAge = new Date();
    minAge.setFullYear(minAge.getFullYear() - 13);
    if (dob > minAge) {
      res.status(400).json({ error: 'User must be at least 13 years old' });
      return;
    }
  }

  const updates: { name: string; phoneNumber?: string; dateOfBirth?: string } = {
    name: name.trim(),
  };
  if (phone_number !== undefined) updates.phoneNumber = phone_number;
  if (date_of_birth !== undefined) updates.dateOfBirth = date_of_birth;

  const [updatedUser] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, req.user!.user_id))
    .returning();

  if (!updatedUser) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.status(200).json({ user: updatedUser });
});

export default router;
