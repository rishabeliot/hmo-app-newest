import { Router, Request, Response } from 'express';
import { db, events as eventsTable, eventAllowlist } from '../../../lib/db';
import { eq } from 'drizzle-orm';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const allEvents = await db.select().from(eventsTable);

  if (!req.user) {
    const eventsWithFlags = allEvents.map((event) => ({
      ...event,
      isAllowed: false,
      isBooked: false,
      ticketPrice: null,
    }));
    const upcoming = eventsWithFlags.find((e) => e.isUpcoming) ?? null;
    const past = eventsWithFlags
      .filter((e) => !e.isUpcoming)
      .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
    res.json({ upcoming, past });
    return;
  }

  const userId = req.user.user_id;

  const allowlistRows = await db.select().from(eventAllowlist).where(eq(eventAllowlist.userId, userId));

  // Auto-insert allowlist rows for non-waitlisted open events
  const allowlistSet = new Set(allowlistRows.map((r) => r.eventId));
  const toAutoAdd = allEvents.filter(
    (e) => !e.waitlistingEnabled && !e.isTicketingClosed && !allowlistSet.has(e.id)
  );

  if (toAutoAdd.length > 0) {
    await Promise.all(
      toAutoAdd.map((e) =>
        db.insert(eventAllowlist).values({
          eventId: e.id,
          userId,
          ticketPrice: e.defaultTicketPrice,
          paymentMode: 'razorpay',
          bookingStatus: 'invited',
        }).onConflictDoNothing()
      )
    );
    const refreshed = await db.select().from(eventAllowlist).where(eq(eventAllowlist.userId, userId));
    allowlistRows.splice(0, allowlistRows.length, ...refreshed);
  }

  const allowlistByEvent = new Map(allowlistRows.map((r) => [r.eventId, r]));

  const eventsWithFlags = allEvents.map((event) => {
    const row = allowlistByEvent.get(event.id);
    return {
      ...event,
      isAllowed: !!row,
      isBooked: row?.bookingStatus === 'Booked',
      ticketPrice: row?.ticketPrice ?? null,
    };
  });

  const upcoming = eventsWithFlags.find((e) => e.isUpcoming) ?? null;
  const past = eventsWithFlags
    .filter((e) => !e.isUpcoming)
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

  res.json({ upcoming, past });
});

export default router;
