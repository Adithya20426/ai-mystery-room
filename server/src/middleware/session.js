import crypto from 'node:crypto';
import { env } from '../config/env.js';

const cookieName = 'casefile_session';
function sign(value) { return crypto.createHmac('sha256', env.sessionSecret).update(value).digest('hex'); }
export function sessionMiddleware(req, res, next) {
  const raw = req.cookies[cookieName];
  if (raw) {
    const [id, signature] = raw.split('.');
    const expected = id && sign(id);
    if (expected && signature && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) { req.sessionId = id; return next(); }
  }
  const id = crypto.randomBytes(32).toString('hex');
  res.cookie(cookieName, `${id}.${sign(id)}`, { httpOnly: true, sameSite: 'lax', secure: env.nodeEnv === 'production', maxAge: 1000 * 60 * 60 * 24 * 30, path: '/' });
  req.sessionId = id;
  next();
}
