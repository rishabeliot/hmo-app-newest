import { Router, Request, Response } from 'express';
import { db } from '../../../lib/db';
import { waitlist } from '../../../lib/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, ig_handle, email, event_id } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    // Idempotency check via ig_handle (if provided)
    if (ig_handle) {
      const normalizedIg = ig_handle.toLowerCase().replace(/^@/, '');
      const existing = await db
        .select()
        .from(waitlist)
        .where(
          event_id
            ? and(eq(waitlist.igHandle, ig_handle), eq(waitlist.eventId, event_id))
            : and(eq(waitlist.igHandle, ig_handle), isNull(waitlist.eventId))
        )
        .limit(1);

      // Also check normalised form
      if (existing.length === 0) {
        const existingNorm = await db
          .select()
          .from(waitlist)
          .where(
            event_id
              ? and(sql`LOWER(LTRIM(${waitlist.igHandle}, '@')) = ${normalizedIg}`, eq(waitlist.eventId, event_id))
              : and(sql`LOWER(LTRIM(${waitlist.igHandle}, '@')) = ${normalizedIg}`, isNull(waitlist.eventId))
          )
          .limit(1);
        if (existingNorm.length > 0) {
          res.status(409).json({ error: "You're already on the waitlist!" });
          return;
        }
      } else {
        res.status(409).json({ error: "You're already on the waitlist!" });
        return;
      }
    }

    await db.insert(waitlist).values({
      name,
      phoneNumber: null,
      igHandle: ig_handle ?? null,
      email: email ?? null,
      eventId: event_id ?? null,
    });

    res.status(200).json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
