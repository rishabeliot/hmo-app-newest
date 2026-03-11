import { Router, Request, Response } from 'express';
import { db } from '../../../lib/db';
import { eventAllowlist, users, events, waitlist, tickets } from '../../../lib/db/schema';
import { eq, and, ilike, or, desc, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { sendWaitlistInvite } from '../services/mailer';

const router = Router();

function guardAdmin(req: Request, res: Response): boolean {
  if (!req.user?.is_admin) {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
}

// GET /admin/events
router.get('/events', requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (!guardAdmin(req, res)) return;

  const allEvents = await db
    .select({
      id: events.id,
      title: events.title,
      eventDate: events.eventDate,
      venue: events.venue,
      isTicketingClosed: events.isTicketingClosed,
      isUpcoming: events.isUpcoming,
    })
    .from(events)
    .orderBy(desc(events.eventDate));

  res.json({ events: allEvents });
});

// GET /admin/events/:id
router.get('/events/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (!guardAdmin(req, res)) return;

  const eventId = req.params.id as string;

  const [event] = await db
    .select({
      id: events.id,
      title: events.title,
      eventDate: events.eventDate,
      venue: events.venue,
      isTicketingClosed: events.isTicketingClosed,
      isUpcoming: events.isUpcoming,
    })
    .from(events)
    .where(eq(events.id, eventId));

  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  res.json({ event });
});

// GET /admin/events/:id/attendees
router.get('/events/:id/attendees', requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (!guardAdmin(req, res)) return;

  const eventId = req.params.id as string;
  const { search, sort, order } = req.query as { search?: string; sort?: string; order?: string };

  let attendees = await db
    .select({
      user_id: users.id,
      name: users.name,
      email: users.email,
      phone_number: users.phoneNumber,
      ticket_price: eventAllowlist.ticketPrice,
      payment_mode: eventAllowlist.paymentMode,
      booking_status: eventAllowlist.bookingStatus,
      entry_status: tickets.entryStatus,
    })
    .from(eventAllowlist)
    .innerJoin(users, eq(eventAllowlist.userId, users.id))
    .leftJoin(
      tickets,
      and(eq(tickets.eventId, eventAllowlist.eventId), eq(tickets.userId, eventAllowlist.userId))
    )
    .where(
      search
        ? and(
            eq(eventAllowlist.eventId, eventId),
            or(
              ilike(sql`COALESCE(${users.name}, '')`, `%${search}%`),
              ilike(users.email, `%${search}%`)
            )
          )
        : eq(eventAllowlist.eventId, eventId)
    );

  if (sort) {
    attendees = attendees.sort((a, b) => {
      const aVal = String((a as Record<string, unknown>)[sort] ?? '');
      const bVal = String((b as Record<string, unknown>)[sort] ?? '');
      return order === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
    });
  }

  res.json({ attendees });
});

// POST /admin/events/:id/attendees
router.post('/events/:id/attendees', requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (!guardAdmin(req, res)) return;

  const eventId = req.params.id as string;
  const { email, ticket_price, payment_mode } = req.body;

  if (!email || ticket_price === undefined || !payment_mode) {
    res.status(400).json({ error: 'email, ticket_price, and payment_mode are required' });
    return;
  }

  const validModes = ['razorpay', 'cash_div', 'cash_ted'];
  if (!validModes.includes(payment_mode)) {
    res.status(400).json({ error: 'Invalid payment_mode' });
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const [existing] = await db
    .select()
    .from(eventAllowlist)
    .where(and(eq(eventAllowlist.eventId, eventId), eq(eventAllowlist.userId, user.id)));

  if (existing) {
    res.status(409).json({ error: 'User already on allowlist for this event' });
    return;
  }

  await db.insert(eventAllowlist).values({
    eventId,
    userId: user.id,
    ticketPrice: Number(ticket_price),
    paymentMode: payment_mode,
    bookingStatus: 'invited',
  });

  res.status(201).json({ ok: true });
});

// GET /admin/events/:id/attendees/export
router.get('/events/:id/attendees/export', requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (!guardAdmin(req, res)) return;

  const eventId = req.params.id as string;

  const rows = await db
    .select({
      name: users.name,
      email: users.email,
      phone_number: users.phoneNumber,
      payment_mode: eventAllowlist.paymentMode,
      booking_status: tickets.bookingStatus,
      entry_status: tickets.entryStatus,
    })
    .from(eventAllowlist)
    .innerJoin(users, eq(eventAllowlist.userId, users.id))
    .innerJoin(
      tickets,
      and(eq(tickets.eventId, eventAllowlist.eventId), eq(tickets.userId, eventAllowlist.userId))
    )
    .where(and(eq(eventAllowlist.eventId, eventId), eq(tickets.bookingStatus, 'confirmed')));

  const header = 'Name,Email,Phone,Payment Mode,Booking Status,Entry Status';
  const lines = rows.map((r) =>
    [r.name ?? '', r.email, r.phone_number ?? '', r.payment_mode, r.booking_status, r.entry_status ?? 'not_entered']
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
  const csv = [header, ...lines].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="attendees.csv"');
  res.send(csv);
});

// PATCH /admin/events/:id/attendees/:userId/payment-mode
router.patch('/events/:id/attendees/:userId/payment-mode', requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (!guardAdmin(req, res)) return;

  const eventId = req.params.id as string;
  const userId = req.params.userId as string;
  const { payment_mode } = req.body;

  const validModes = ['razorpay', 'cash_div', 'cash_ted'];
  if (!payment_mode || !validModes.includes(payment_mode)) {
    res.status(400).json({ error: 'Invalid payment_mode' });
    return;
  }

  await db
    .update(eventAllowlist)
    .set({ paymentMode: payment_mode })
    .where(and(eq(eventAllowlist.eventId, eventId), eq(eventAllowlist.userId, userId)));

  res.json({ ok: true });
});

// PATCH /admin/events/:id/attendees/:userId/ticket-price
router.patch('/events/:id/attendees/:userId/ticket-price', requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (!guardAdmin(req, res)) return;

  const eventId = req.params.id as string;
  const userId = req.params.userId as string;
  const { ticket_price } = req.body;

  if (ticket_price === undefined || typeof ticket_price !== 'number' || ticket_price < 0) {
    res.status(400).json({ error: 'ticket_price must be a non-negative number (in paise)' });
    return;
  }

  await db
    .update(eventAllowlist)
    .set({ ticketPrice: ticket_price })
    .where(and(eq(eventAllowlist.eventId, eventId), eq(eventAllowlist.userId, userId)));

  res.json({ ok: true });
});

// PATCH /admin/events/:id/close-ticketing
router.patch('/events/:id/close-ticketing', requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (!guardAdmin(req, res)) return;

  const eventId = req.params.id as string;

  await db
    .update(events)
    .set({ isTicketingClosed: true })
    .where(eq(events.id, eventId));

  res.json({ ok: true });
});

// GET /admin/events/:id/waitlist
router.get('/events/:id/waitlist', requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (!guardAdmin(req, res)) return;

  const eventId = req.params.id as string;

  const entries = await db
    .select({
      id: waitlist.id,
      name: waitlist.name,
      email: waitlist.email,
      ig_handle: waitlist.igHandle,
      added_to_event: waitlist.addedToEvent,
      created_at: waitlist.createdAt,
    })
    .from(waitlist)
    .where(eq(waitlist.eventId, eventId));

  res.json({ waitlist: entries });
});

// POST /admin/waitlist/:id/promote
router.post('/waitlist/:id/promote', requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (!guardAdmin(req, res)) return;

  const entryId = req.params.id as string;
  const { event_id, ticket_price, payment_mode } = req.body;

  if (!event_id || ticket_price === undefined || !payment_mode) {
    res.status(400).json({ error: 'event_id, ticket_price, and payment_mode are required' });
    return;
  }

  const [entry] = await db.select().from(waitlist).where(eq(waitlist.id, entryId));
  if (!entry) {
    res.status(404).json({ error: 'Waitlist entry not found' });
    return;
  }

  if (!entry.email) {
    res.status(422).json({ error: 'Waitlist entry has no email — cannot link to a user account' });
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.email, entry.email));
  if (!user) {
    res.status(404).json({ error: 'No user found with this email' });
    return;
  }

  const [existing] = await db
    .select()
    .from(eventAllowlist)
    .where(and(eq(eventAllowlist.eventId, event_id), eq(eventAllowlist.userId, user.id)));

  if (existing) {
    res.status(409).json({ error: 'User already on allowlist for this event' });
    return;
  }

  const [eventRecord] = await db.select({ title: events.title, eventDate: events.eventDate }).from(events).where(eq(events.id, event_id));

  await Promise.all([
    db.insert(eventAllowlist).values({
      eventId: event_id,
      userId: user.id,
      ticketPrice: Number(ticket_price),
      paymentMode: payment_mode,
      bookingStatus: 'invited',
    }),
    db.update(waitlist).set({ addedToEvent: true }).where(eq(waitlist.id, entryId)),
  ]);

  if (eventRecord) {
    const appUrl = process.env.CORS_ORIGIN ?? 'https://hearmeout.live';
    sendWaitlistInvite(user.email, user.name, eventRecord.title, eventRecord.eventDate, appUrl).catch((err) =>
      console.error('Failed to send waitlist invite email:', err)
    );
  }

  res.json({ ok: true });
});

export default router;
