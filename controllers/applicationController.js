const database = require('../db');

const allowedStatuses = ['applied', 'interview', 'offer', 'rejected'];
const editableFields = ['company', 'role', 'status', 'applied_date', 'notes'];

function validateApplicationField(field, value) {
  if (field === 'company' || field === 'role') {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return `${field} is required and must not be empty`;
    }

    if (value.trim().length > 100) {
      return `${field} must be 100 characters or fewer`;
    }
  }

  if (field === 'status' && (typeof value !== 'string' || !allowedStatuses.includes(value))) {
    return 'status must be applied, interview, offer, or rejected';
  }

  if (field === 'applied_date') {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return 'applied_date must be a real date in YYYY-MM-DD format';
    }

    const parsedDate = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== value) {
      return 'applied_date must be a real date in YYYY-MM-DD format';
    }
  }

  if (field === 'notes' && (typeof value !== 'string' || value.length > 500)) {
    return 'notes must be a string of 500 characters or fewer';
  }

  return null;
}

function validateApplicationBody(req, res, requiredFields) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ error: 'Request body must be a JSON object' });
    return null;
  }

  const fieldsToValidate = requiredFields || editableFields.filter((field) => (
    Object.prototype.hasOwnProperty.call(body, field)
  ));

  if (fieldsToValidate.length === 0) {
    res.status(400).json({ error: 'At least one valid application field must be provided' });
    return null;
  }

  const values = {};
  for (const field of fieldsToValidate) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) {
      res.status(400).json({ error: `${field} is required` });
      return null;
    }

    const validationError = validateApplicationField(field, body[field]);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return null;
    }

    values[field] = field === 'company' || field === 'role'
      ? body[field].trim()
      : body[field];
  }

  return values;
}

function parseApplicationId(req, res) {
  const idText = req.params.id;
  if (!/^[1-9]\d*$/.test(idText)) {
    res.status(400).json({ error: 'Application id must be a positive whole number' });
    return null;
  }

  const id = Number(idText);
  if (!Number.isSafeInteger(id)) {
    res.status(400).json({ error: 'Application id must be a positive whole number' });
    return null;
  }

  return id;
}

function findOwnedApplication(id, userId, res) {
  const application = database
    .prepare('SELECT * FROM applications WHERE id = ?')
    .get(id);

  if (!application) {
    res.status(404).json({ error: 'Application not found' });
    return null;
  }

  if (application.user_id !== userId) {
    res.status(403).json({ error: 'You do not have permission to access this application' });
    return null;
  }

  return application;
}

function createApplication(req, res, next) {
  const values = validateApplicationBody(req, res, ['company', 'role']);
  if (!values) {
    return;
  }

  // Optional fields are stored as SQL NULL so omitted values remain distinguishable.
  const status = Object.prototype.hasOwnProperty.call(req.body, 'status')
    ? req.body.status
    : 'applied';
  if (Object.prototype.hasOwnProperty.call(req.body, 'status')) {
    const statusError = validateApplicationField('status', status);
    if (statusError) {
      return res.status(400).json({ error: statusError });
    }
  }

  const optionalValues = validateApplicationBody(
    { body: req.body },
    res,
    ['company', 'role']
  );
  if (!optionalValues) {
    return;
  }

  for (const field of ['applied_date', 'notes']) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      const fieldError = validateApplicationField(field, req.body[field]);
      if (fieldError) {
        return res.status(400).json({ error: fieldError });
      }
    }
  }

  const appliedDate = Object.prototype.hasOwnProperty.call(req.body, 'applied_date')
    ? req.body.applied_date
    : null;
  const notes = Object.prototype.hasOwnProperty.call(req.body, 'notes')
    ? req.body.notes
    : null;
  const now = new Date().toISOString();

  try {
    const result = database
      .prepare(`
        INSERT INTO applications (
          user_id, company, role, status, applied_date, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(req.userId, values.company, values.role, status, appliedDate, notes, now, now);

    const createdApplication = database
      .prepare('SELECT * FROM applications WHERE id = ? AND user_id = ?')
      .get(result.lastInsertRowid, req.userId);

    return res.status(201).json(createdApplication);
  } catch (error) {
    return next(error);
  }
}

function listApplications(req, res, next) {
  try {
    // Filtering in SQL ensures a user never receives another user's records.
    const applications = database
      .prepare('SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC, id DESC')
      .all(req.userId);

    return res.status(200).json(applications);
  } catch (error) {
    return next(error);
  }
}

function getApplication(req, res, next) {
  const id = parseApplicationId(req, res);
  if (id === null) {
    return;
  }

  try {
    const application = findOwnedApplication(id, req.userId, res);
    if (!application) {
      return;
    }

    return res.status(200).json(application);
  } catch (error) {
    return next(error);
  }
}

function updateApplication(req, res, next) {
  const id = parseApplicationId(req, res);
  if (id === null) {
    return;
  }

  const values = validateApplicationBody(req, res);
  if (!values) {
    return;
  }

  try {
    const application = findOwnedApplication(id, req.userId, res);
    if (!application) {
      return;
    }

    // Field names come only from the fixed allowlist; values stay parameterized.
    const assignments = Object.keys(values).map((field) => `${field} = ?`);
    const parameters = Object.values(values).concat(new Date().toISOString(), id, req.userId);

    database
      .prepare(`
        UPDATE applications
        SET ${assignments.join(', ')}, updated_at = ?
        WHERE id = ? AND user_id = ?
      `)
      .run(...parameters);

    const updatedApplication = database
      .prepare('SELECT * FROM applications WHERE id = ? AND user_id = ?')
      .get(id, req.userId);

    return res.status(200).json(updatedApplication);
  } catch (error) {
    return next(error);
  }
}

function deleteApplication(req, res, next) {
  const id = parseApplicationId(req, res);
  if (id === null) {
    return;
  }

  try {
    const application = findOwnedApplication(id, req.userId, res);
    if (!application) {
      return;
    }

    database
      .prepare('DELETE FROM applications WHERE id = ? AND user_id = ?')
      .run(id, req.userId);

    return res.status(200).json({ message: 'Application deleted' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createApplication,
  listApplications,
  getApplication,
  updateApplication,
  deleteApplication
};
