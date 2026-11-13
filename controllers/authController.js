const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const database = require('../db');

function isValidEmail(email) {
  if (typeof email !== 'string') {
    return false;
  }

  const normalizedEmail = email.trim();
  const atIndex = normalizedEmail.indexOf('@');
  const dotIndex = normalizedEmail.indexOf('.', atIndex + 1);

  return atIndex > 0 && dotIndex > atIndex + 1 && dotIndex < normalizedEmail.length - 1;
}

function validateCredentials(req, res) {
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ error: 'Request body must be a JSON object' });
    return null;
  }

  if (!isValidEmail(body.email)) {
    res.status(400).json({ error: 'A valid email is required' });
    return null;
  }

  if (typeof body.password !== 'string' || body.password.length < 6) {
    res.status(400).json({ error: 'Password is required and must be at least 6 characters' });
    return null;
  }

  return {
    email: body.email.trim().toLowerCase(),
    password: body.password
  };
}

function register(req, res, next) {
  const credentials = validateCredentials(req, res);
  if (!credentials) {
    return;
  }

  try {
    const existingUser = database
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(credentials.email);

    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // Store only the one-way password hash; never return it in the API response.
    const passwordHash = bcrypt.hashSync(credentials.password, 10);
    database
      .prepare('INSERT INTO users (email, password, created_at) VALUES (?, ?, ?)')
      .run(credentials.email, passwordHash, new Date().toISOString());

    return res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    return next(error);
  }
}

function login(req, res, next) {
  const credentials = validateCredentials(req, res);
  if (!credentials) {
    return;
  }

  try {
    const user = database
      .prepare('SELECT id, password FROM users WHERE email = ?')
      .get(credentials.email);

    // Use the same response for unknown emails and incorrect passwords.
    if (!user || !bcrypt.compareSync(credentials.password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({ token });
  } catch (error) {
    return next(error);
  }
}

module.exports = { register, login };
