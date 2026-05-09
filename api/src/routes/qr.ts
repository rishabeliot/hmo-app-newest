import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { db } from '../../../lib/db';
import { tickets } from '../../../lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /qr-image/:token — public, serves QR PNG from raw JWT token
export const qrImageRouter = Router();

qrImageRouter.get('/:token', async (req: Request, res: Response): Promise<void> => {
  const token = req.params.token as string;

  if (!token) {
    res.status(400).json({ error: 'token is required' });
    return;
  }

  try {
    const buffer = await QRCode.toBuffer(token, { width: 300, margin: 2 });
    res.setHeader('Content-Type', 'image/png');
    res.status(200).send(buffer);
  } catch (err) {
    console.error('[qr-image]', err);
    res.status(500).json({ error: 'Failed to generate QR image' });
  }
});

// GET /qr/:ticket_id — public, looks up ticket in DB and serves QR PNG
// Short, clean URL for sharing via WhatsApp
export const qrTicketRouter = Router();

qrTicketRouter.get('/:ticket_id', async (req: Request, res: Response): Promise<void> => {
  const { ticket_id } = req.params;

  const [ticket] = await db
    .select({ qrCodeToken: tickets.qrCodeToken })
    .from(tickets)
    .where(eq(tickets.id, ticket_id));

  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  if (!ticket.qrCodeToken) {
    res.status(400).json({ error: 'Ticket not yet confirmed' });
    return;
  }

  try {
    const buffer = await QRCode.toBuffer(ticket.qrCodeToken, { width: 300, margin: 2 });
    res.setHeader('Content-Type', 'image/png');
    res.status(200).send(buffer);
  } catch (err) {
    console.error('[qr-ticket]', err);
    res.status(500).json({ error: 'Failed to generate QR image' });
  }
});
