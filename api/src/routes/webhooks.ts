import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { db } from '../../../lib/db';
import { tickets, eventAllowlist, users, events } from '../../../lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { sendTicketConfirmation } from '../services/mailer';

const router = Router();

router.post('/razorpay', async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['x-razorpay-signature'];

  if (!signature || typeof signature !== 'string') {
    res.status(400).json({ error: 'Missing signature' });
    return;
  }

  const rawBody = req.body as Buffer;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex');

  if (expected !== signature) {
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  const event = JSON.parse(rawBody.toString());

  if (event.event !== 'payment.captured') {
    res.status(200).json({ received: true });
    return;
  }

  const razorpayOrderId: string = event.payload?.payment?.entity?.order_id;
  const razorpayPaymentId: string = event.payload?.payment?.entity?.id;

  if (!razorpayOrderId) {
    res.status(200).json({ received: true });
    return;
  }

  const [ticket] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.razorpayOrderId, razorpayOrderId));

  if (!ticket) {
    res.status(200).json({ received: true });
    return;
  }

  if (ticket.bookingStatus === 'confirmed') {
    res.status(200).json({ received: true });
    return;
  }

  const qrCodeToken = jwt.sign(
    { ticket_id: ticket.id, event_id: ticket.eventId, user_id: ticket.userId, issued_at: Date.now() },
    process.env.QR_HMAC_SECRET!,
    { expiresIn: '30d' }
  );

  await db
    .update(tickets)
    .set({ bookingStatus: 'confirmed', razorpayPaymentId, qrCodeToken })
    .where(eq(tickets.id, ticket.id));

  await db
    .update(eventAllowlist)
    .set({ bookingStatus: 'Booked' })
    .where(and(eq(eventAllowlist.eventId, ticket.eventId), eq(eventAllowlist.userId, ticket.userId)));

  const [[user], [eventRecord], qrBuffer] = await Promise.all([
    db.select().from(users).where(eq(users.id, ticket.userId)),
    db.select().from(events).where(eq(events.id, ticket.eventId)),
    QRCode.toBuffer(qrCodeToken, { width: 300, margin: 2 }),
  ]);

  if (user && eventRecord) {
    sendTicketConfirmation(user.email, user.name, qrBuffer, eventRecord.title, eventRecord.eventDate).catch(console.error);
  }

  res.status(200).json({ received: true });
});

export default router;
