import crypto from 'crypto';
import redis from './redis';
import { resend } from './mailer';

export async function checkRateLimit(email: string): Promise<boolean> {
  const key = `otp_rl:${email}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 600);
  return count <= 3;
}

export async function sendOtp(email: string): Promise<void> {
  const otp = crypto.randomInt(100000, 1000000).toString();
  await redis.set(`otp:${email}`, otp, 'EX', 300);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: 'Your HMO login code',
    text: `Your code is ${otp}. Valid for 5 minutes.`,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}

export async function verifyOtp(email: string, otp: string): Promise<boolean> {
  const stored = await redis.get(`otp:${email}`);
  if (!stored || stored !== otp) return false;
  await redis.del(`otp:${email}`);
  return true;
}
