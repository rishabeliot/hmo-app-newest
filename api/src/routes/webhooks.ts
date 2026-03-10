import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../../../lib/db';
import { tickets, eventAllowlist } from '../../../lib/db/schema';
import { and, eq } from 'drizzle-orm';

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

  await db
    .update(tickets)
    .set({ bookingStatus: 'confirmed', razorpayPaymentId })
    .where(eq(tickets.id, ticket.id));

  await db
    .update(eventAllowlist)
    .set({ bookingStatus: 'confirmed' })
    .where(and(eq(eventAllowlist.eventId, ticket.eventId), eq(eventAllowlist.userId, ticket.userId)));

  res.status(200).json({ received: true });
});

export default router;
