import { Router, Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { db } from '../../../lib/db';
import { eventAllowlist, tickets, events, users } from '../../../lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { sendTicketConfirmation } from '../services/mailer';
import { sendWhatsAppTicketConfirmation } from '../services/whatsapp';

const router = Router();

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

// POST /tickets/create-order
router.post('/create-order', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
  const { event_id } = req.body;

  if (!event_id || typeof event_id !== 'string') {
    res.status(400).json({ error: 'event_id is required' });
    return;
  }

  const userId = req.user!.user_id;

  const [allowlistRow] = await db
    .select()
    .from(eventAllowlist)
    .where(and(eq(eventAllowlist.eventId, event_id), eq(eventAllowlist.userId, userId)));

  if (!allowlistRow) {
    res.status(403).json({ error: 'You are not on the allowlist for this event' });
    return;
  }

  if (allowlistRow.bookingStatus === 'Booked') {
    const [existingTicket] = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.eventId, event_id), eq(tickets.userId, userId)));
    res.status(409).json({ error: 'Ticket already confirmed for this event', ticket_id: existingTicket?.id });
    return;
  }

  const amount = allowlistRow.ticketPrice;
  const receipt = `rcpt_${Date.now()}`;

  const order = await getRazorpay().orders.create({
    amount,
    currency: 'INR',
    receipt,
  });

  const razorpayOrderId = order.id;

  const existingTickets = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.eventId, event_id), eq(tickets.userId, userId)));

  if (existingTickets.length > 0) {
    await db
      .update(tickets)
      .set({ bookingStatus: 'pending', razorpayOrderId })
      .where(and(eq(tickets.eventId, event_id), eq(tickets.userId, userId)));
  } else {
    await db.insert(tickets).values({
      eventId: event_id,
      userId,
      bookingStatus: 'pending',
      razorpayOrderId,
    });
  }

  res.status(200).json({
    order_id: razorpayOrderId,
    amount,
    currency: 'INR',
    key_id: process.env.RAZORPAY_KEY_ID,
  });
  } catch (err) {
    console.error('[create-order]', err);
    res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// POST /tickets/confirm
router.post('/confirm', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ error: 'Missing payment fields' });
    return;
  }

  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex');

  if (expected !== razorpay_signature) {
    res.status(400).json({ error: 'Invalid payment signature' });
    return;
  }

  const [ticket] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.razorpayOrderId, razorpay_order_id));

  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  // Idempotent — already confirmed
  if (ticket.bookingStatus === 'confirmed') {
    res.status(200).json({ ticket_id: ticket.id });
    return;
  }

  const qrCodeToken = jwt.sign(
    { ticket_id: ticket.id, event_id: ticket.eventId, user_id: ticket.userId, issued_at: Date.now() },
    process.env.QR_HMAC_SECRET!,
    { expiresIn: '30d' }
  );

  await db
    .update(tickets)
    .set({ bookingStatus: 'confirmed', razorpayPaymentId: razorpay_payment_id, qrCodeToken })
    .where(eq(tickets.id, ticket.id));

  await db
    .update(eventAllowlist)
    .set({ bookingStatus: 'Booked' })
    .where(and(eq(eventAllowlist.eventId, ticket.eventId), eq(eventAllowlist.userId, ticket.userId)));

  const [[user], [event], qrBuffer] = await Promise.all([
    db.select().from(users).where(eq(users.id, ticket.userId)),
    db.select().from(events).where(eq(events.id, ticket.eventId)),
    QRCode.toBuffer(qrCodeToken, { width: 300, margin: 2 }),
  ]);

  if (user && event) {
    sendTicketConfirmation(user.email, user.name, qrBuffer, event.title, event.eventDate).catch(console.error);
    if (user.phoneNumber) {
      sendWhatsAppTicketConfirmation(user.phoneNumber).catch(console.error);
    }
  }

  res.status(200).json({ ticket_id: ticket.id });
  } catch (err) {
    console.error('[confirm]', err);
    res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// POST /tickets/dev-confirm (dev only)
router.post('/dev-confirm', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const { event_id } = req.body;
  if (!event_id || typeof event_id !== 'string') {
    res.status(400).json({ error: 'event_id is required' });
    return;
  }

  const userId = req.user!.user_id;

  const [allowlistRow] = await db
    .select()
    .from(eventAllowlist)
    .where(and(eq(eventAllowlist.eventId, event_id), eq(eventAllowlist.userId, userId)));

  if (!allowlistRow) {
    res.status(403).json({ error: 'You are not on the allowlist for this event' });
    return;
  }

  if (allowlistRow.bookingStatus === 'Booked') {
    const [existingTicket] = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.eventId, event_id), eq(tickets.userId, userId)));
    res.status(409).json({ error: 'Already booked', ticket_id: existingTicket?.id });
    return;
  }

  // Find or insert ticket in pending state
  const existingTickets = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.eventId, event_id), eq(tickets.userId, userId)));

  let ticketId: string;
  if (existingTickets.length > 0) {
    ticketId = existingTickets[0].id;
  } else {
    const [inserted] = await db
      .insert(tickets)
      .values({ eventId: event_id, userId, bookingStatus: 'pending' })
      .returning({ id: tickets.id });
    ticketId = inserted.id;
  }

  const qrCodeToken = jwt.sign(
    { ticket_id: ticketId, event_id, user_id: userId, issued_at: Date.now() },
    process.env.QR_HMAC_SECRET!,
    { expiresIn: '30d' }
  );

  await db
    .update(tickets)
    .set({ bookingStatus: 'confirmed', qrCodeToken })
    .where(eq(tickets.id, ticketId));

  await db
    .update(eventAllowlist)
    .set({ bookingStatus: 'Booked' })
    .where(and(eq(eventAllowlist.eventId, event_id), eq(eventAllowlist.userId, userId)));

  const [[user], [event], qrBuffer] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)),
    db.select().from(events).where(eq(events.id, event_id)),
    QRCode.toBuffer(qrCodeToken, { width: 300, margin: 2 }),
  ]);

  if (user && event) {
    sendTicketConfirmation(user.email, user.name, qrBuffer, event.title, event.eventDate).catch(console.error);
    if (user.phoneNumber) {
      sendWhatsAppTicketConfirmation(user.phoneNumber).catch(console.error);
    }
  }

  res.status(200).json({ ticket_id: ticketId });
  } catch (err) {
    console.error('[dev-confirm]', err);
    res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// GET /tickets — list caller's confirmed tickets with event details
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.user_id;
    const userTickets = await db
      .select({
        id: tickets.id,
        eventId: tickets.eventId,
        bookingStatus: tickets.bookingStatus,
        entryStatus: tickets.entryStatus,
        createdAt: tickets.createdAt,
        event: {
          title: events.title,
          eventDate: events.eventDate,
          venue: events.venue,
          backgroundImageUrl: events.backgroundImageUrl,
        },
      })
      .from(tickets)
      .innerJoin(events, eq(tickets.eventId, events.id))
      .where(and(eq(tickets.userId, userId), eq(tickets.bookingStatus, 'confirmed')));
    res.json(userTickets);
  } catch (err) {
    console.error('[GET /tickets]', err);
    res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

// GET /tickets/:id
router.get('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userId = req.user!.user_id;
  const isAdmin = req.user!.is_admin;

  const [ticket] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, id));

  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  if (ticket.userId !== userId && !isAdmin) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, ticket.eventId));

  res.status(200).json({ ...ticket, event });
});

// POST /tickets/:id/admit  [Admin only]
router.post('/:id/admit', requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (!req.user!.is_admin) {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  const ticketId = req.params.id as string;
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  if (ticket.entryStatus === 'admitted') {
    res.status(409).json({ error: 'Already admitted' });
    return;
  }
  await db.update(tickets).set({ entryStatus: 'admitted' }).where(eq(tickets.id, ticketId));
  res.json({ ok: true });
});

// GET /tickets/:id/qr
router.get('/:id/qr', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const userId = req.user!.user_id;
  const isAdmin = req.user!.is_admin;

  const [ticket] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, id));

  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  if (ticket.userId !== userId && !isAdmin) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  if (!ticket.qrCodeToken) {
    res.status(400).json({ error: 'Ticket not yet confirmed' });
    return;
  }

  const buffer = await QRCode.toBuffer(ticket.qrCodeToken, { width: 300, margin: 2 });
  res.setHeader('Content-Type', 'image/png');
  res.status(200).send(buffer);
});

export default router;
