const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const { sql } = require('./db');
const { authenticate, createSession, hashPassword, verifyPassword } = require('./auth');
const { nanoid } = require('nanoid');

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*';
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const validateEmail = (email) => typeof email === 'string' && /\S+@\S+\.\S+/.test(email);
const validatePassword = (password) => typeof password === 'string' && password.length >= 6;

app.post('/v1/auth/register', async (req, res) => {
  const { email, password } = req.body || {};

  if (!validateEmail(email) || !validatePassword(password)) {
    return res.status(400).send('Invalid email or password');
  }

  try {
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return res.status(409).send('Email already exists');
    }

    const userId = `usr_${nanoid(16)}`;
    const passwordHash = hashPassword(password);
    const createdAt = new Date().toISOString();

    await sql`
      INSERT INTO users (id, email, password_hash, created_at, updated_at)
      VALUES (${userId}, ${email}, ${passwordHash}, ${createdAt}, ${createdAt})
    `;

    const session = await createSession(userId);

    return res.status(201).json({
      user: {
        id: userId,
        email,
        createdAt,
        lastSignInAt: createdAt,
      },
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Failed to register user:', error);
    return res.status(500).send('Failed to register user');
  }
});

app.post('/v1/auth/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!validateEmail(email) || !validatePassword(password)) {
    return res.status(400).send('Invalid email or password');
  }

  try {
    const users = await sql`
      SELECT id, password_hash, created_at
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;

    if (!users.length) {
      return res.status(404).send('User not found');
    }

    const user = users[0];
    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).send('Invalid password');
    }

    const session = await createSession(user.id);
    const lastSignInAt = new Date().toISOString();
    await sql`UPDATE users SET updated_at = ${lastSignInAt} WHERE id = ${user.id}`;

    return res.status(200).json({
      user: {
        id: user.id,
        email,
        createdAt: user.created_at,
        lastSignInAt,
      },
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Failed to login user:', error);
    return res.status(500).send('Failed to login user');
  }
});

app.post('/v1/auth/password-reset', async (req, res) => {
  const { email } = req.body || {};

  if (!validateEmail(email)) {
    return res.status(400).send('Invalid email');
  }

  try {
    await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    return res.status(204).send();
  } catch (error) {
    console.error('Failed to request password reset:', error);
    return res.status(500).send('Failed to request password reset');
  }
});

app.use(authenticate);

app.post('/v1/auth/logout', async (req, res) => {
  try {
    await sql`
      DELETE FROM user_sessions
      WHERE user_id = ${req.userId} AND token_hash = ${req.tokenHash}
    `;
    res.status(204).send();
  } catch (error) {
    console.error('Failed to logout:', error);
    res.status(500).send('Failed to logout');
  }
});

app.delete('/v1/auth/account', async (req, res) => {
  try {
    await sql`DELETE FROM users WHERE id = ${req.userId}`;
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete account:', error);
    res.status(500).send('Failed to delete account');
  }
});

app.get('/v1/measurements', async (req, res) => {
  try {
    const rows = await sql`
      SELECT id, value, type, timestamp, notes
      FROM glucose_measurements
      WHERE user_id = ${req.userId}
      ORDER BY timestamp DESC
    `;
    res.json(rows);
  } catch (error) {
    console.error('Failed to fetch measurements:', error);
    res.status(500).send('Failed to fetch measurements');
  }
});

app.post('/v1/measurements', async (req, res) => {
  const { id, value, type, timestamp, notes } = req.body || {};

  if (!id || typeof value !== 'number' || !type || typeof timestamp !== 'number') {
    return res.status(400).send('Invalid payload');
  }

  try {
    await sql`
      INSERT INTO glucose_measurements (id, user_id, value, type, timestamp, notes)
      VALUES (${id}, ${req.userId}, ${value}, ${type}, ${timestamp}, ${notes ?? null})
      ON CONFLICT (id, user_id)
      DO UPDATE SET
        value = EXCLUDED.value,
        type = EXCLUDED.type,
        timestamp = EXCLUDED.timestamp,
        notes = EXCLUDED.notes,
        updated_at = NOW()
    `;

    res.status(201).json({ id, value, type, timestamp, notes: notes ?? undefined });
  } catch (error) {
    console.error('Failed to insert measurement:', error);
    res.status(500).send('Failed to insert measurement');
  }
});

app.delete('/v1/measurements/:id', async (req, res) => {
  try {
    await sql`
      DELETE FROM glucose_measurements
      WHERE id = ${req.params.id} AND user_id = ${req.userId}
    `;
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete measurement:', error);
    res.status(500).send('Failed to delete measurement');
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Neon sync API listening on port ${port}`);
});
