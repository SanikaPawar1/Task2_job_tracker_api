require('dotenv').config();

// Fail before opening the database or accepting traffic without a signing secret.
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Set it in the .env file before starting the server.');
  process.exit(1);
}

const express = require('express');
const authRoutes = require('./routes/authRoutes');
const applicationRoutes = require('./routes/applicationRoutes');

const app = express();

// Parse JSON request bodies before routes; malformed JSON is handled below.
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);

// Return the same JSON response for every path without a matching route.
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Keep internal error details in server logs, never in the client response.
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof SyntaxError && error.status === 400 && Object.prototype.hasOwnProperty.call(error, 'body')) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  console.error('Unexpected error:', error);
  return res.status(500).json({ error: 'Something went wrong' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Job Application Tracker API is running on port ${port}`);
});
