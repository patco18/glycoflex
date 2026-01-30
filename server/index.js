const express = require('express');
const cors = require('cors');
const { sql } = require('./db');
const { authenticate } = require('./auth');

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*';
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(authenticate);

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
