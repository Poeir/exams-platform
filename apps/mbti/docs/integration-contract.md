# MBTI Service Integration

This repository now owns the MBTI frontend, API, and Azure SQL result store
(accessed through Prisma ORM). The parent website owns login and the master
user profile. It passes an authenticated external user reference to this
service when creating an assessment attempt.

Static MBTI display content remains in `src/data.js`. Azure SQL stores user
mapping, attempts, calculated result codes, score details, and submitted
responses.

## Ownership

| Data | Owner |
| --- | --- |
| Login and primary user profile | Parent website |
| `source_system` + `external_user_id` mapping | MBTI service database |
| Assessment attempts and opaque tokens | MBTI service database |
| Assessment results and history | MBTI service database |
| Result display text and mascots | `src/data.js` |
| Trusted scoring | MBTI service backend |

## Local Setup

Start SQL Server (Azure SQL Edge) with Docker:

```powershell
docker compose up -d sqlserver
```

Configure the backend in PowerShell, migrate the database, and start the API:

```powershell
$env:DATABASE_URL='sqlserver://localhost:1433;database=mbti_personality;user=sa;password=Your_password123;encrypt=true;trustServerCertificate=true'
$env:PARENT_API_KEY='dev-parent-key'
npm run db:migrate:dev
npm run server
```

Start the Vite frontend in another terminal:

```powershell
npm run dev
```

Vite proxies `/api` to `http://localhost:3001`.

With the API running, verify database persistence in another terminal:

```powershell
npm run api:smoke
```

## Database Tables

Schema: `prisma/schema.prisma` (migrations generated under `prisma/migrations/`)

```text
assessment_subjects
- maps a parent identity to an internal MBTI subject

assessment_attempts
- stores one test run and a hash of its opaque completion token

assessment_results
- stores server-calculated MBTI results and responses for one attempt
- JSON columns are NVARCHAR(MAX) (SQL Server has no native JSON type)
```

The service does not duplicate static `TYPES` display content in Azure SQL
because the content is treated as fixed.

## Parent Website API

The parent backend calls this endpoint after authenticating its user. The
`X-API-Key` must be sent server-to-server, never from production browser
code.

```http
POST /api/v1/assessment-attempts
X-API-Key: <PARENT_API_KEY>
Content-Type: application/json

{
  "sourceSystem": "main_web",
  "externalUserId": "usr_123",
  "email": "alice@example.com",
  "displayName": "Alice"
}
```

Response:

```json
{
  "id": "attempt-uuid",
  "attemptToken": "opaque-token",
  "userId": "usr_123",
  "launchUrl": "http://localhost:5174/?attempt_id=...&attempt_token=..."
}
```

To fetch history for an authenticated parent user:

```http
GET /api/v1/subjects/main_web/usr_123/results
X-API-Key: <PARENT_API_KEY>
```

## Test App Completion API

The frontend receives an opaque token through the `launchUrl`, removes it from
the visible URL, and submits it as a bearer token when the quiz is complete:

```http
POST /api/v1/assessment-attempts/:attemptId/complete
Authorization: Bearer <attempt-token>
Content-Type: application/json
```

```json
{
  "version": "1.0",
  "responses": {
    "q1": "q1-a",
    "q12": {
      "distribution": {
        "q12-a": 25,
        "q12-b": 25,
        "q12-c": 25,
        "q12-d": 25
      }
    }
  }
}
```

The browser also includes its display result in the current payload, but the
backend intentionally ignores that result and calculates `mbti_code`, axes,
confidence, and facets again from `responses`.

The attempt token can load its own completed result:

```http
GET /api/v1/assessment-results/:resultId
Authorization: Bearer <attempt-token>
```

## Development Integration Sandbox

The Vite development panel supports two persistence modes:

| Mode | Purpose |
| --- | --- |
| `Browser mock` | UI-only testing using `localStorage` |
| `Azure SQL service` | Full API/database integration testing |

For `Azure SQL service`:

1. Run SQL Server, migrations, API, and Vite as described above.
2. Select `Azure SQL service` in the development panel.
3. Select fake user `Alice` or `Bob`.
4. Select `Start integrated test` and complete the quiz.
5. Switch users or refresh to verify results are read from Azure SQL.

In production, the fake-user panel is not included; the parent backend creates
attempts and opens the returned `launchUrl`.
