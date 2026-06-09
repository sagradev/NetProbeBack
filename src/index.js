'use strict';

const express = require('express');
const cors = require('cors');
const mikrotikRoutes = require('./routes/mikrotik');
const diagnosticRoutes = require('./routes/diagnostic');
const { MikrotikConnectionError } = require('./utils/errors');

const app = express();
const PORT = process.env.PORT || 8080;
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',').map(o => o.trim());

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  maxAge: 3600,
}));

app.use(express.json());

app.use('/api/mikrotik', mikrotikRoutes);
app.use('/api/diagnostic', diagnosticRoutes);

app.use((err, req, res, next) => {
  if (err instanceof MikrotikConnectionError) {
    return res.status(502).json({ error: err.message, code: err.code });
  }
  console.error('Unexpected error:', err.message);
  res.status(500).json({ error: err.message || 'Erro interno', code: 'INTERNAL_ERROR' });
});

app.listen(PORT, () => console.log(`NetProbe backend running on port ${PORT}`));
