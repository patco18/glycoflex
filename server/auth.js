const crypto = require('crypto');
const { nanoid } = require('nanoid');
const { sql } = require('./db');

const SESSION_DURATION_DAYS = 30;

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const hashedPassword = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(hashedPassword, 'hex')
  );
};

const createSession = async (userId) => {
  const token = nanoid(48);
  const tokenHash = hashToken(token);
  const sessionId = nanoid(24);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await sql`
    INSERT INTO user_sessions (id, user_id, token_hash, expires_at)
    VALUES (${sessionId}, ${userId}, ${tokenHash}, ${expiresAt.toISOString()})
  `;

  return { token, sessionId, expiresAt };
};

const getSessionForToken = async (token) => {
  const tokenHash = hashToken(token);
  const rows = await sql`
    SELECT user_sessions.id AS session_id, user_sessions.user_id, users.email
    FROM user_sessions
    JOIN users ON users.id = user_sessions.user_id
    WHERE user_sessions.token_hash = ${tokenHash}
      AND user_sessions.expires_at > NOW()
    LIMIT 1
  `;

  if (!rows.length) return null;

  return {
    sessionId: rows[0].session_id,
    userId: rows[0].user_id,
    email: rows[0].email,
    tokenHash,
  };
};

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).send('Missing Authorization header');
    }

    const token = header.replace('Bearer ', '').trim();
    const session = await getSessionForToken(token);

    if (!session) {
      return res.status(401).send('Invalid auth token');
    }

    req.userId = session.userId;
    req.userEmail = session.email;
    req.sessionId = session.sessionId;
    req.tokenHash = session.tokenHash;
    return next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).send('Invalid auth token');
  }
};

module.exports = {
  authenticate,
  createSession,
  hashPassword,
  verifyPassword,
};
