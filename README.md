# Job Application Tracker REST API

Requires Node.js 20 or newer.

A JSON REST API that lets people register, sign in, and manage their own job applications. Each application is associated with its owner; an authenticated user cannot read, update, or delete another user's application.

## Technology

- Node.js and Express (CommonJS)
- SQLite with `better-sqlite3`
- Password hashing with `bcryptjs`
- JWT authentication with `jsonwebtoken`
- Environment configuration with `dotenv`
- Development reloads with `nodemon`

## Run locally

1. Install Node.js.
2. Install project dependencies:

   ```sh
   npm install
   ```

3. Copy `.env.example` to `.env` and set `PORT` and a long, random `JWT_SECRET`. Do not share or commit `.env`.
4. Start the development server:

   ```sh
   npm run dev
   ```

   Use `npm start` for a normal server start. The SQLite database file `jobtracker.db` is created automatically beside `db.js`.

The server listens on port `3000` by default. All request and response bodies use JSON.

## Endpoints

| Method | Path | Authentication required |
|---|---|---|
| POST | `/api/auth/register` | No |
| POST | `/api/auth/login` | No |
| POST | `/api/applications` | Yes |
| GET | `/api/applications` | Yes |
| GET | `/api/applications/:id` | Yes |
| PUT | `/api/applications/:id` | Yes |
| DELETE | `/api/applications/:id` | Yes |

Protected endpoint requests use this header:

```http
Authorization: Bearer <token>
```

### Register — `POST /api/auth/register`

Request:

```json
{ "email": "alex@example.com", "password": "secure123" }
```

Success (`201`):

```json
{ "message": "User registered successfully" }
```

Possible errors:

| Status | Example response |
|---|---|
| 400 | `{ "error": "Request body must be a JSON object" }` |
| 400 | `{ "error": "A valid email is required" }` |
| 400 | `{ "error": "Password is required and must be at least 6 characters" }` |
| 400 | `{ "error": "An account with this email already exists" }` |
| 400 | `{ "error": "Invalid JSON" }` |
| 500 | `{ "error": "Something went wrong" }` |

### Login — `POST /api/auth/login`

Request:

```json
{ "email": "alex@example.com", "password": "secure123" }
```

Success (`200`):

```json
{ "token": "<signed JWT>" }
```

Possible errors:

| Status | Example response |
|---|---|
| 400 | `{ "error": "Request body must be a JSON object" }` |
| 400 | `{ "error": "A valid email is required" }` |
| 400 | `{ "error": "Password is required and must be at least 6 characters" }` |
| 400 | `{ "error": "Invalid JSON" }` |
| 401 | `{ "error": "Invalid email or password" }` |
| 500 | `{ "error": "Something went wrong" }` |

### Create application — `POST /api/applications`

Request:

```json
{
  "company": "Acme Corp",
  "role": "Backend Developer",
  "status": "applied",
  "applied_date": "2026-11-09",
  "notes": "Applied through the company website"
}
```

`status`, `applied_date`, and `notes` are optional. If `status` is omitted, it defaults to `applied`.

Success (`201`; timestamps are examples):

```json
{
  "id": 1,
  "user_id": 1,
  "company": "Acme Corp",
  "role": "Backend Developer",
  "status": "applied",
  "applied_date": "2026-11-09",
  "notes": "Applied through the company website",
  "created_at": "2026-11-09T12:00:00.000Z",
  "updated_at": "2026-11-09T12:00:00.000Z"
}
```

Possible errors:

| Status | Example response |
|---|---|
| 400 | `{ "error": "Request body must be a JSON object" }` |
| 400 | `{ "error": "company is required" }` or `{ "error": "role is required" }` |
| 400 | `{ "error": "company is required and must not be empty" }` |
| 400 | `{ "error": "role is required and must not be empty" }` |
| 400 | `{ "error": "company must be 100 characters or fewer" }` or `{ "error": "role must be 100 characters or fewer" }` |
| 400 | `{ "error": "status must be applied, interview, offer, or rejected" }` |
| 400 | `{ "error": "applied_date must be a real date in YYYY-MM-DD format" }` |
| 400 | `{ "error": "notes must be a string of 500 characters or fewer" }` |
| 400 | `{ "error": "Invalid JSON" }` |
| 401 | `{ "error": "Token missing" }` or `{ "error": "Invalid or expired token" }` |
| 500 | `{ "error": "Something went wrong" }` |

Company and role are trimmed, required, and limited to 100 characters. Dates must be real calendar dates. Notes are limited to 500 characters.

### List my applications — `GET /api/applications`

No request body. Only the authenticated user's applications are returned, newest first.

Success (`200`):

```json
[
  {
    "id": 1,
    "user_id": 1,
    "company": "Acme Corp",
    "role": "Backend Developer",
    "status": "applied",
    "applied_date": "2026-11-09",
    "notes": null,
    "created_at": "2026-11-09T12:00:00.000Z",
    "updated_at": "2026-11-09T12:00:00.000Z"
  }
]
```

Possible errors: `400` with `{ "error": "Invalid JSON" }` for a malformed JSON body; `401` with `{ "error": "Token missing" }` or `{ "error": "Invalid or expired token" }`; `500` with `{ "error": "Something went wrong" }`.

### Get one application — `GET /api/applications/:id`

No request body. Replace `:id` with the application ID.

Success (`200`): the same application object shown in the create response.

Possible errors:

| Status | Example response |
|---|---|
| 400 | `{ "error": "Invalid JSON" }` |
| 400 | `{ "error": "Application id must be a positive whole number" }` |
| 401 | `{ "error": "Token missing" }` or `{ "error": "Invalid or expired token" }` |
| 403 | `{ "error": "You do not have permission to access this application" }` |
| 404 | `{ "error": "Application not found" }` |
| 500 | `{ "error": "Something went wrong" }` |

### Update one application — `PUT /api/applications/:id`

Send one or more editable fields. Fields not included remain unchanged.

Request:

```json
{ "status": "interview", "notes": "Interview scheduled" }
```

Success (`200`): the complete updated application object.

Possible errors:

| Status | Example response |
|---|---|
| 400 | `{ "error": "Invalid JSON" }` |
| 400 | `{ "error": "Request body must be a JSON object" }` |
| 400 | `{ "error": "Application id must be a positive whole number" }` |
| 400 | `{ "error": "At least one valid application field must be provided" }` |
| 400 | `{ "error": "company is required and must not be empty" }` or `{ "error": "role is required and must not be empty" }` |
| 400 | `{ "error": "company must be 100 characters or fewer" }` or `{ "error": "role must be 100 characters or fewer" }` |
| 400 | `{ "error": "status must be applied, interview, offer, or rejected" }` |
| 400 | `{ "error": "applied_date must be a real date in YYYY-MM-DD format" }` |
| 400 | `{ "error": "notes must be a string of 500 characters or fewer" }` |
| 401 | `{ "error": "Token missing" }` or `{ "error": "Invalid or expired token" }` |
| 403 | `{ "error": "You do not have permission to access this application" }` |
| 404 | `{ "error": "Application not found" }` |
| 500 | `{ "error": "Something went wrong" }` |

### Delete one application — `DELETE /api/applications/:id`

No request body.

Success (`200`):

```json
{ "message": "Application deleted" }
```

Possible errors: `400` with `{ "error": "Invalid JSON" }` for a malformed JSON body or `{ "error": "Application id must be a positive whole number" }`; `401` with `{ "error": "Token missing" }` or `{ "error": "Invalid or expired token" }`; `403` with `{ "error": "You do not have permission to access this application" }`; `404` with `{ "error": "Application not found" }`; or `500` with `{ "error": "Something went wrong" }`.

## Shared error responses

Malformed JSON sent to a known endpoint returns `400` with `{ "error": "Invalid JSON" }`. A path without a matching endpoint returns `404` with `{ "error": "Route not found" }`. Unexpected server errors return only `500` with `{ "error": "Something went wrong" }`; stack traces are not sent to clients.

## Status codes

| Code | Meaning |
|---|---|
| 200 | Request succeeded |
| 201 | Resource created |
| 400 | Invalid request, invalid JSON, or duplicate email |
| 401 | Authentication token missing/invalid or credentials rejected |
| 403 | Application belongs to another user |
| 404 | Application or route not found |
| 500 | Unexpected server error |

## Project structure

```text
server.js                         Creates the Express app, mounts routes, and starts the server
db.js                             Opens SQLite and creates the tables
routes/authRoutes.js              Maps registration and login endpoints
routes/applicationRoutes.js       Maps protected application endpoints
controllers/authController.js     Validates credentials and handles registration/login
controllers/applicationController.js Validates and manages application records
middleware/authMiddleware.js      Verifies bearer JWTs and identifies the user
.env                              Local port and private JWT signing secret
.env.example                      Example environment variable names and values
.gitignore                        Excludes dependencies, local secrets, and database files
package.json                      Project metadata, scripts, and dependencies
README.md                         Setup and API reference
```
