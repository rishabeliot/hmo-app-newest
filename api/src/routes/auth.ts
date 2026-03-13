import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db, users } from '../../../lib/db';
import { events as eventsTable, eventAllowlist } from '../../../lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkRateLimit, sendOtp, verifyOtp } from '../services/otp';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/send-otp', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email || !EMAIL_REGEX.test(email)) {
    res.status(400).json({ error: 'email must be a valid email address' });
    return;
  }

  const normalised = email.toLowerCase();

  const allowed = await checkRateLimit(normalised);
  if (!allowed) {
    res.status(429).json({ error: 'Too many OTP requests. Try again in 10 minutes.' });
    return;
  }

  try {
    await sendOtp(normalised);
    res.status(200).json({ message: 'OTP sent' });
  } catch (err) {
    console.error('[send-otp] Resend error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body;

  if (!email || !EMAIL_REGEX.test(email)) {
    res.status(400).json({ error: 'email must be a valid email address' });
    return;
  }

  if (!otp || typeof otp !== 'string') {
    res.status(400).json({ error: 'otp is required' });
    return;
  }

  const normalised = email.toLowerCase();

  const valid = await verifyOtp(normalised, otp);
  if (!valid) {
    res.status(401).json({ error: 'Invalid OTP' });
    return;
  }

  await db.insert(users).values({ email: normalised }).onConflictDoNothing();

  const [user] = await db.select().from(users).where(eq(users.email, normalised));

  if (!user) {
    res.status(500).json({ error: 'User lookup failed' });
    return;
  }

  // Auto-insert allowlist rows for non-waitlisted open events
  const openEvents = await db
    .select()
    .from(eventsTable)
    .where(and(eq(eventsTable.waitlistingEnabled, false), eq(eventsTable.isTicketingClosed, false)));

  if (openEvents.length > 0) {
    await Promise.all(
      openEvents.map((e) =>
        db.insert(eventAllowlist).values({
          eventId: e.id,
          userId: user.id,
          ticketPrice: e.defaultTicketPrice,
          paymentMode: 'razorpay',
          bookingStatus: 'invited',
        }).onConflictDoNothing()
      )
    );
  }

  const token = jwt.sign(
    { user_id: user.id, is_admin: user.isAdmin },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' }
  );

  res.status(200).json({ token, is_new_user: user.name === null });
});

export default router;
