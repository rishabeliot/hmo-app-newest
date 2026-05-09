import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import profileRouter from './routes/profile';
import eventsRouter from './routes/events';
import ticketsRouter from './routes/tickets';
import webhooksRouter from './routes/webhooks';
import adminRouter from './routes/admin';
import waitlistRouter from './routes/waitlist';
import { qrImageRouter, qrTicketRouter } from './routes/qr';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000', credentials: true }));

// Webhook must receive raw body for Razorpay HMAC verification — mount BEFORE express.json()
app.use('/webhooks', express.raw({ type: 'application/json' }), webhooksRouter);

app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRouter);
app.use('/auth', profileRouter);
app.use('/events', eventsRouter);
app.use('/tickets', ticketsRouter);
app.use('/admin', adminRouter);
app.use('/waitlist', waitlistRouter);
app.use('/qr-image', qrImageRouter);
app.use('/qr', qrTicketRouter);

app.listen(Number(process.env.PORT ?? 4000), () =>
  console.log(`[api] http://localhost:${process.env.PORT ?? 4000}`)
);
