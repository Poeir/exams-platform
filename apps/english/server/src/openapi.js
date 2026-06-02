// OpenAPI 3.0 spec for the english-test admin/engine API.
// Mounted via swagger-ui-express in index.js at /api/docs (UI) and
// /api/openapi.json (raw spec).

const tags = [
  { name: 'Meta', description: 'Service health' },
  { name: 'Papers', description: 'Exam paper CRUD and scoring' },
  { name: 'Sections', description: 'Sections (parts) under a paper' },
  { name: 'Items', description: 'Question items under a section' },
  { name: 'Attempts', description: 'Candidate attempt lifecycle: launch → consume → answer → submit' },
  { name: 'Admin', description: 'Admin SPA endpoints (HTTP Basic auth)' },
  { name: 'Seed', description: 'Bulk-load papers from JSON' },
];

const securitySchemes = {
  adminBasic: {
    type: 'http',
    scheme: 'basic',
    description: 'ADMIN_USERNAME / ADMIN_PASSWORD via HTTP Basic auth',
  },
  parentApiKey: {
    type: 'apiKey',
    in: 'header',
    name: 'X-API-Key',
    description: 'Shared PARENT_API_KEY for server-to-server calls from the parent site',
  },
};

const schemas = {
  Error: {
    type: 'object',
    properties: { error: { type: 'string' } },
    required: ['error'],
  },
  Paper: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string', nullable: true },
      status: { type: 'string', example: 'draft' },
      total_score: { type: 'number' },
      time_limit_min: { type: 'number' },
      created_at: { type: 'string', format: 'date-time', nullable: true },
      completed_at: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  PaperInput: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Optional — server generates a UUID if omitted' },
      name: { type: 'string', default: 'Untitled paper' },
      description: { type: 'string', nullable: true },
      status: { type: 'string', default: 'draft' },
      total_score: { type: 'number', default: 0 },
      time_limit_min: { type: 'number', default: 0 },
    },
  },
  PaperPatch: {
    type: 'object',
    description: 'Any subset of writable fields',
    properties: {
      name: { type: 'string' },
      description: { type: 'string', nullable: true },
      status: { type: 'string' },
      total_score: { type: 'number' },
      time_limit_min: { type: 'number' },
      completed_at: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  Item: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      stem: { type: 'string' },
      question_type: { type: 'string', nullable: true },
      options: {
        type: 'object',
        description: 'Letter → text map (A/B/C/D…). `_extras` carries non-letter metadata.',
        additionalProperties: true,
        example: { A: 'apple', B: 'banana', C: 'cherry', D: 'date', _extras: {} },
      },
      cefr_level: { type: 'string', nullable: true },
      difficulty_band: { type: 'string', nullable: true },
      score_weight: { type: 'number', nullable: true },
      objective: { type: 'string', nullable: true },
      tags: { type: 'array', items: { type: 'string' } },
      correct_answer: { type: 'string', description: 'Present only on admin/withAnswers views' },
      explanation: { type: 'string', nullable: true, description: 'Present only on admin/withAnswers views' },
      judge_score: { type: 'number', nullable: true },
    },
  },
  ItemInput: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      stem: { type: 'string' },
      question_type: { type: 'string', nullable: true },
      cefr_level: { type: 'string', nullable: true },
      difficulty_band: { type: 'string', nullable: true },
      score_weight: { type: 'number', default: 1 },
      correct_answer: { type: 'string', default: 'A' },
      explanation: { type: 'string', nullable: true },
      judge_score: { type: 'number', nullable: true },
      objective: { type: 'string', nullable: true },
      tags: { type: 'array', items: { type: 'string' } },
      order_index: { type: 'integer', default: 0 },
      options: { type: 'object', additionalProperties: true, example: { A: '', B: '', C: '', D: '' } },
      extras: { type: 'object', additionalProperties: true },
    },
  },
  ItemPatch: {
    type: 'object',
    description: 'Any subset of writable fields',
    properties: {
      stem: { type: 'string' },
      question_type: { type: 'string', nullable: true },
      cefr_level: { type: 'string', nullable: true },
      difficulty_band: { type: 'string', nullable: true },
      score_weight: { type: 'number' },
      correct_answer: { type: 'string' },
      explanation: { type: 'string', nullable: true },
      judge_score: { type: 'number', nullable: true },
      objective: { type: 'string', nullable: true },
      order_index: { type: 'integer' },
      tags: { type: 'array', items: { type: 'string' } },
      options: { type: 'object', additionalProperties: true },
      extras: { type: 'object', additionalProperties: true },
    },
  },
  Section: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      skill: { type: 'string', nullable: true },
      cefr: { type: 'string', nullable: true },
      topic: { type: 'string', nullable: true },
      passage_length: { type: 'integer', nullable: true },
      item_count: { type: 'integer' },
      section_score: { type: 'number' },
      section_time_min: { type: 'number' },
      passage_id: { type: 'string', nullable: true },
      passage_content: { type: 'string' },
      items: { type: 'array', items: { $ref: '#/components/schemas/Item' } },
    },
  },
  SectionInput: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string', default: 'New section' },
      part_number: { type: 'integer', nullable: true, description: 'Inferred from name ("Part N") if omitted' },
      skill: { type: 'string', nullable: true },
      cefr: { type: 'string', nullable: true },
      topic: { type: 'string', nullable: true },
      passage_length: { type: 'integer', nullable: true },
      item_count: { type: 'integer', default: 0 },
      section_score: { type: 'number', default: 0 },
      section_time_min: { type: 'number', default: 0 },
      passage_id: { type: 'string', nullable: true },
      passage_content: { type: 'string', default: '' },
      order_index: { type: 'integer', default: 0 },
    },
  },
  SectionPatch: {
    type: 'object',
    description: 'Any subset of writable fields',
    properties: {
      name: { type: 'string' },
      part_number: { type: 'integer', nullable: true },
      skill: { type: 'string', nullable: true },
      cefr: { type: 'string', nullable: true },
      topic: { type: 'string', nullable: true },
      passage_length: { type: 'integer', nullable: true },
      item_count: { type: 'integer' },
      section_score: { type: 'number' },
      section_time_min: { type: 'number' },
      passage_id: { type: 'string', nullable: true },
      passage_content: { type: 'string' },
      order_index: { type: 'integer' },
    },
  },
  PaperBundle: {
    type: 'object',
    properties: {
      paper: { $ref: '#/components/schemas/Paper' },
      sections: { type: 'array', items: { $ref: '#/components/schemas/Section' } },
    },
  },
  ScoreResult: {
    type: 'object',
    description: 'Aggregate result returned by scoreAnswers — see src/scoring.js',
    properties: {
      skills: {
        type: 'object',
        additionalProperties: true,
        example: {
          listening: { correct: 0, total: 0 },
          reading: { correct: 0, total: 0 },
          total: { correct: 0, total: 0 },
        },
      },
    },
    additionalProperties: true,
  },
  Attempt: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      paper_id: { type: 'string' },
      subject_id: { type: 'string', format: 'uuid', nullable: true },
      source_system: { type: 'string', nullable: true },
      external_user_id: { type: 'string', nullable: true },
      status: { type: 'string', enum: ['pending', 'in_progress', 'submitted', 'expired'] },
      answers: { type: 'object', additionalProperties: { type: 'string' } },
      correct_total: { type: 'integer', nullable: true },
      max_total: { type: 'integer', nullable: true },
      cefr_level: { type: 'string', nullable: true },
      cefr_label: { type: 'string', nullable: true },
      result: { $ref: '#/components/schemas/ScoreResult' },
      time_limit_min: { type: 'integer', nullable: true },
      started_at: { type: 'string', format: 'date-time', nullable: true },
      submitted_at: { type: 'string', format: 'date-time', nullable: true },
      expires_at: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  ParentAttempt: {
    type: 'object',
    description:
      'Parent-facing attempt shape — camelCase keys + unified status vocabulary '
      + '(terminal status is "completed", matching the mbti engine). The raw '
      + 'answers map is omitted. Internal/candidate endpoints use Attempt instead.',
    properties: {
      id: { type: 'string' },
      paperId: { type: 'string' },
      subjectId: { type: 'string', format: 'uuid', nullable: true },
      sourceSystem: { type: 'string', nullable: true },
      externalUserId: { type: 'string', nullable: true },
      status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'expired'] },
      correctTotal: { type: 'integer', nullable: true },
      maxTotal: { type: 'integer', nullable: true },
      cefrLevel: { type: 'string', nullable: true },
      cefrLabel: { type: 'string', nullable: true },
      result: { $ref: '#/components/schemas/ScoreResult' },
      timeLimitMin: { type: 'integer', nullable: true },
      startedAt: { type: 'string', format: 'date-time', nullable: true },
      completedAt: { type: 'string', format: 'date-time', nullable: true },
      expiresAt: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  AdminAttemptRow: {
    type: 'object',
    description: 'List row used by the admin attempts table — paper name joined in.',
    properties: {
      id: { type: 'string' },
      paper_id: { type: 'string' },
      paper_name: { type: 'string', nullable: true },
      subject_id: { type: 'string', format: 'uuid', nullable: true },
      source_system: { type: 'string', nullable: true },
      external_user_id: { type: 'string', nullable: true },
      display_name: { type: 'string', nullable: true },
      status: { type: 'string' },
      correct_total: { type: 'integer', nullable: true },
      max_total: { type: 'integer', nullable: true },
      cefr_level: { type: 'string', nullable: true },
      cefr_label: { type: 'string', nullable: true },
      time_limit_min: { type: 'integer', nullable: true },
      created_at: { type: 'string', format: 'date-time', nullable: true },
      started_at: { type: 'string', format: 'date-time', nullable: true },
      submitted_at: { type: 'string', format: 'date-time', nullable: true },
      expires_at: { type: 'string', format: 'date-time', nullable: true },
    },
  },
};

const r = (ref) => ({ $ref: `#/components/schemas/${ref}` });
const jsonBody = (schema, required = true) => ({
  required,
  content: { 'application/json': { schema } },
});
const jsonResp = (schema, description = 'OK') => ({
  description,
  content: { 'application/json': { schema } },
});
const errorResp = (description) => ({
  description,
  content: { 'application/json': { schema: r('Error') } },
});

const paths = {
  '/api/health': {
    get: {
      tags: ['Meta'],
      summary: 'Liveness probe',
      responses: {
        200: jsonResp({ type: 'object', properties: { ok: { type: 'boolean' } } }, 'Service is up'),
      },
    },
  },

  '/api/papers': {
    get: {
      tags: ['Papers'],
      summary: 'List all papers',
      responses: {
        200: jsonResp({ type: 'array', items: r('Paper') }),
      },
    },
    post: {
      tags: ['Papers'],
      summary: 'Create a paper',
      security: [{ adminBasic: [] }],
      requestBody: jsonBody(r('PaperInput')),
      responses: {
        201: jsonResp(r('Paper'), 'Created'),
        401: errorResp('Admin auth required'),
      },
    },
  },

  '/api/papers/{id}': {
    get: {
      tags: ['Papers'],
      summary: 'Get a paper with its sections + items',
      description: 'Public by default. Pass `withAnswers=1` to include `correct_answer` and `explanation`; that view requires admin auth.',
      parameters: [
        { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        { in: 'query', name: 'withAnswers', required: false, schema: { type: 'string', enum: ['0', '1', 'true', 'false'] } },
      ],
      responses: {
        200: jsonResp(r('PaperBundle')),
        401: errorResp('withAnswers requested without admin auth'),
        404: errorResp('Paper not found'),
      },
    },
    patch: {
      tags: ['Papers'],
      summary: 'Update writable fields on a paper',
      security: [{ adminBasic: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      requestBody: jsonBody(r('PaperPatch')),
      responses: {
        200: jsonResp(r('Paper')),
        400: errorResp('No fields to update'),
        401: errorResp('Admin auth required'),
        404: errorResp('Paper not found'),
      },
    },
    delete: {
      tags: ['Papers'],
      summary: 'Delete a paper',
      security: [{ adminBasic: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: {
        204: { description: 'Deleted' },
        401: errorResp('Admin auth required'),
        404: errorResp('Paper not found'),
      },
    },
  },

  '/api/papers/{id}/score': {
    post: {
      tags: ['Papers'],
      summary: 'Score a submission against the paper key',
      description: 'Stateless — the answer key never leaves the server. The client posts only its answers and gets back aggregate totals.',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          answers: {
            type: 'object',
            additionalProperties: { type: 'string', example: 'A' },
            description: 'itemId → selected letter',
          },
        },
      }),
      responses: {
        200: jsonResp(r('ScoreResult')),
        404: errorResp('Paper not found'),
      },
    },
  },

  '/api/papers/{paperId}/sections': {
    post: {
      tags: ['Sections'],
      summary: 'Create a section under a paper',
      security: [{ adminBasic: [] }],
      parameters: [{ in: 'path', name: 'paperId', required: true, schema: { type: 'string' } }],
      requestBody: jsonBody(r('SectionInput')),
      responses: {
        201: jsonResp(r('Section'), 'Created'),
        401: errorResp('Admin auth required'),
      },
    },
  },

  '/api/sections/{id}': {
    patch: {
      tags: ['Sections'],
      summary: 'Update writable fields on a section',
      security: [{ adminBasic: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      requestBody: jsonBody(r('SectionPatch')),
      responses: {
        200: jsonResp(r('Section')),
        400: errorResp('No fields to update'),
        401: errorResp('Admin auth required'),
        404: errorResp('Section not found'),
      },
    },
    delete: {
      tags: ['Sections'],
      summary: 'Delete a section',
      security: [{ adminBasic: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: {
        204: { description: 'Deleted' },
        401: errorResp('Admin auth required'),
        404: errorResp('Section not found'),
      },
    },
  },

  '/api/sections/{sectionId}/items': {
    post: {
      tags: ['Items'],
      summary: 'Create an item under a section',
      security: [{ adminBasic: [] }],
      parameters: [{ in: 'path', name: 'sectionId', required: true, schema: { type: 'string' } }],
      requestBody: jsonBody(r('ItemInput')),
      responses: {
        201: jsonResp(r('Item'), 'Created'),
        401: errorResp('Admin auth required'),
      },
    },
  },

  '/api/items/{id}': {
    patch: {
      tags: ['Items'],
      summary: 'Update writable fields on an item',
      security: [{ adminBasic: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      requestBody: jsonBody(r('ItemPatch')),
      responses: {
        200: jsonResp(r('Item')),
        400: errorResp('No fields to update'),
        401: errorResp('Admin auth required'),
        404: errorResp('Item not found'),
      },
    },
    delete: {
      tags: ['Items'],
      summary: 'Delete an item',
      security: [{ adminBasic: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: {
        204: { description: 'Deleted' },
        401: errorResp('Admin auth required'),
        404: errorResp('Item not found'),
      },
    },
  },

  '/api/seed': {
    post: {
      tags: ['Seed'],
      summary: 'Bulk-load papers + sections + items',
      description: 'Posts the same shape as `papers_export_1_full.json`. If body lacks `papers`, the server seeds from the default JSON on disk.',
      security: [{ adminBasic: [] }],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          papers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                paper: r('PaperInput'),
                sections: { type: 'array', items: r('SectionInput') },
              },
            },
          },
        },
      }, false),
      responses: {
        200: jsonResp({
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            papers: { type: 'integer' },
            sections: { type: 'integer' },
            items: { type: 'integer' },
          },
        }),
        401: errorResp('Admin auth required'),
      },
    },
  },

  '/api/sessions': {
    post: {
      tags: ['Attempts'],
      summary: 'Create a launch session (parent → engine handoff)',
      description: 'Creates a pending attempt + one-time launch token. Returns the launchUrl the parent opens in the candidate\'s browser. Request/response keys are camelCase — the unified parent contract across both assessment engines (snake_case request keys are still accepted as quiet legacy aliases).',
      security: [{ parentApiKey: [] }],
      requestBody: jsonBody({
        type: 'object',
        required: ['paperId'],
        properties: {
          paperId: { type: 'string' },
          externalUserId: {
            type: 'string',
            nullable: true,
            description: 'Candidate id in the parent system. Send the same sourceSystem + externalUserId to every assessment engine so one person maps to one shared subject.',
          },
          sourceSystem: { type: 'string', nullable: true, default: 'english' },
          email: { type: 'string', nullable: true, description: 'Snapshot stored on the shared subject.' },
          displayName: { type: 'string', nullable: true, description: 'Snapshot stored on the shared subject.' },
          callbackUrl: { type: 'string', format: 'uri', nullable: true },
          timeLimitMin: { type: 'integer', nullable: true },
        },
      }),
      responses: {
        201: jsonResp({
          type: 'object',
          properties: {
            attempt: r('ParentAttempt'),
            launchToken: { type: 'string' },
            launchTokenExpiresAt: { type: 'string', format: 'date-time' },
            launchUrl: { type: 'string', format: 'uri' },
          },
        }),
        400: errorResp('paperId is required'),
        401: errorResp('Invalid or missing X-API-Key'),
        404: errorResp('Paper not found'),
      },
    },
  },

  '/api/attempts/anonymous': {
    post: {
      tags: ['Attempts'],
      summary: 'Start an anonymous attempt (no parent handoff)',
      description: 'Public landing path. paper_id is optional — defaults to the most recent paper.',
      requestBody: jsonBody({
        type: 'object',
        properties: { paper_id: { type: 'string', nullable: true } },
      }, false),
      responses: {
        201: jsonResp({
          type: 'object',
          properties: { attempt: r('Attempt'), paper: r('PaperBundle') },
        }),
        404: errorResp('Paper not found / no papers available'),
      },
    },
  },

  '/api/attempts/consume': {
    post: {
      tags: ['Attempts'],
      summary: 'Consume a one-time launch token',
      description: 'Browser POSTs the token on landing at /exam?t=... Token is cleared on success so a refresh cannot restart the attempt.',
      requestBody: jsonBody({
        type: 'object',
        required: ['token'],
        properties: { token: { type: 'string' } },
      }),
      responses: {
        200: jsonResp({
          type: 'object',
          properties: { attempt: r('Attempt'), paper: r('PaperBundle') },
        }),
        400: errorResp('token is required'),
        404: errorResp('invalid_token'),
        410: errorResp('token_already_used / token_expired'),
      },
    },
  },

  '/api/attempts/{id}': {
    get: {
      tags: ['Attempts'],
      summary: 'Fetch attempt by id (used for resume on reload)',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: {
        200: jsonResp({ type: 'object', properties: { attempt: r('Attempt') } }),
        404: errorResp('attempt not found'),
      },
    },
  },

  '/api/attempts/{id}/abandon': {
    post: {
      tags: ['Attempts'],
      summary: 'Abandon an in-flight anonymous attempt',
      description: 'No-op for parent-launched attempts (subject_id or callback_url set) and for terminal rows.',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: {
        200: jsonResp({ type: 'object', properties: { abandoned: { type: 'boolean' } } }),
      },
    },
  },

  '/api/attempts/{id}/answers': {
    patch: {
      tags: ['Attempts'],
      summary: 'Autosave answers',
      description: 'Replaces the whole answers map. Rejects writes once the attempt is no longer in_progress or has expired.',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      requestBody: jsonBody({
        type: 'object',
        required: ['answers'],
        properties: {
          answers: { type: 'object', additionalProperties: { type: 'string' } },
        },
      }),
      responses: {
        200: jsonResp({ type: 'object', properties: { attempt: r('Attempt') } }),
        400: errorResp('answers object required'),
        404: errorResp('attempt not found'),
        409: errorResp('attempt expired / not in_progress'),
      },
    },
  },

  '/api/attempts/{id}/submit': {
    post: {
      tags: ['Attempts'],
      summary: 'Submit an attempt (idempotent)',
      description: 'Scores against the key, snapshots result/cefr/totals, marks submitted, fires webhook to callback_url (parent-launched only) on first submit.',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      requestBody: jsonBody({
        type: 'object',
        properties: {
          answers: {
            type: 'object',
            additionalProperties: { type: 'string' },
            description: 'Optional — defaults to the row\'s autosaved answers.',
          },
        },
      }, false),
      responses: {
        200: jsonResp({ type: 'object', properties: { attempt: r('Attempt') } }),
        404: errorResp('attempt not found'),
        409: errorResp('attempt is not in_progress'),
      },
    },
  },

  '/api/attempts/{id}/redeliver': {
    post: {
      tags: ['Attempts'],
      summary: 'Retry the result webhook for a submitted attempt',
      security: [{ parentApiKey: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: {
        200: jsonResp({ type: 'object', properties: { delivered: { type: 'boolean' } } }),
        401: errorResp('Invalid or missing X-API-Key'),
      },
    },
  },

  '/api/attempts/{id}/view-link': {
    post: {
      tags: ['Attempts'],
      summary: 'Mint a short-lived result view link for the parent site',
      description: 'Exchanges the parent API key for a signed, short-lived URL (default 15 min, VIEW_LINK_TTL_MIN) that opens a read-only result page in a browser — the "open result in a new tab" flow. The token is stateless (HMAC over attempt id + expiry). Only completed attempts can be viewed.',
      security: [{ parentApiKey: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: {
        201: jsonResp({
          type: 'object',
          properties: {
            attemptId: { type: 'string' },
            viewUrl: { type: 'string', format: 'uri' },
            expiresAt: { type: 'string', format: 'date-time' },
          },
        }),
        401: errorResp('Invalid or missing X-API-Key'),
        404: errorResp('No completed attempt with this id'),
      },
    },
  },

  '/api/attempts/view': {
    get: {
      tags: ['Attempts'],
      summary: 'Read-only result summary via a signed view token',
      description: 'Browser-facing endpoint behind the view link. Returns a display summary only — no answer key and no raw answer map. `view_token` is the unified query param across both engines (`vt` is a legacy alias).',
      parameters: [{ in: 'query', name: 'view_token', required: true, schema: { type: 'string' } }],
      responses: {
        200: jsonResp({
          type: 'object',
          properties: {
            viewOnly: { type: 'boolean' },
            attemptId: { type: 'string' },
            paperId: { type: 'string' },
            paperName: { type: 'string', nullable: true },
            displayName: { type: 'string', nullable: true },
            externalUserId: { type: 'string', nullable: true },
            sourceSystem: { type: 'string', nullable: true },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            correctTotal: { type: 'integer', nullable: true },
            maxTotal: { type: 'integer', nullable: true },
            cefrLevel: { type: 'string', nullable: true },
            cefrLabel: { type: 'string', nullable: true },
            result: { type: 'object', nullable: true },
          },
        }),
        401: errorResp('View token is invalid or has expired'),
        404: errorResp('Completed attempt not found'),
      },
    },
  },

  '/api/subjects/{source_system}/{external_user_id}/results': {
    get: {
      tags: ['Attempts'],
      summary: 'Per-person result history (parent-auth gated)',
      description: "Mirrors the mbti engine's GET /api/v1/subjects/{sourceSystem}/{externalUserId}/results so parents query both engines symmetrically. Completed attempts only, newest first.",
      security: [{ parentApiKey: [] }],
      parameters: [
        { in: 'path', name: 'source_system', required: true, schema: { type: 'string' } },
        { in: 'path', name: 'external_user_id', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: jsonResp({
          type: 'object',
          properties: { results: { type: 'array', items: r('ParentAttempt') } },
        }),
        401: errorResp('Invalid or missing X-API-Key'),
      },
    },
  },

  '/api/subjects/{source_system}/{external_user_id}/view-link': {
    post: {
      tags: ['Attempts'],
      summary: "Mint a view link for the subject's latest completed result",
      description: 'Attempt-id-free variant of /api/attempts/{id}/view-link: resolves the latest completed attempt for (sourceSystem, externalUserId) and mints a short-lived signed view URL for it.',
      security: [{ parentApiKey: [] }],
      parameters: [
        { in: 'path', name: 'source_system', required: true, schema: { type: 'string' } },
        { in: 'path', name: 'external_user_id', required: true, schema: { type: 'string' } },
      ],
      responses: {
        201: jsonResp({
          type: 'object',
          properties: {
            attemptId: { type: 'string' },
            completedAt: { type: 'string', format: 'date-time' },
            viewUrl: { type: 'string', format: 'uri' },
            expiresAt: { type: 'string', format: 'date-time' },
          },
        }),
        401: errorResp('Invalid or missing X-API-Key'),
        404: errorResp('No completed attempt for this subject'),
      },
    },
  },

  '/api/attempts': {
    get: {
      tags: ['Attempts'],
      summary: 'List recent attempts (parent-auth gated)',
      security: [{ parentApiKey: [] }],
      parameters: [
        { in: 'query', name: 'limit', required: false, schema: { type: 'integer', default: 50, maximum: 200 } },
      ],
      responses: {
        200: jsonResp({ type: 'array', items: r('ParentAttempt') }),
        401: errorResp('Invalid or missing X-API-Key'),
      },
    },
  },

  '/api/admin/attempts': {
    get: {
      tags: ['Admin'],
      summary: 'Admin SPA — list attempts with paper name joined',
      security: [{ adminBasic: [] }],
      parameters: [
        { in: 'query', name: 'limit', required: false, schema: { type: 'integer', default: 100, maximum: 500 } },
      ],
      responses: {
        200: jsonResp({ type: 'array', items: r('AdminAttemptRow') }),
        401: errorResp('Admin auth required'),
      },
    },
  },

  '/api/admin/attempts/{id}': {
    get: {
      tags: ['Admin'],
      summary: 'Admin SPA — full attempt detail with paper bundle (answers included)',
      security: [{ adminBasic: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      responses: {
        200: jsonResp({
          type: 'object',
          properties: {
            attempt: r('Attempt'),
            paper: { allOf: [r('Paper')], nullable: true },
            sections: { type: 'array', items: r('Section') },
          },
        }),
        401: errorResp('Admin auth required'),
        404: errorResp('attempt not found'),
      },
    },
  },
};

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'english-test API',
    version: '0.0.1',
    description:
      'REST API for the english-test admin/CMS and exam engine. Mounted at `/api/*`. ' +
      'Admin endpoints use HTTP Basic auth (ADMIN_USERNAME/ADMIN_PASSWORD). ' +
      'Parent-site endpoints use a shared `X-API-Key` (PARENT_API_KEY).',
  },
  servers: [
    { url: 'http://localhost:3001', description: 'Local dev (direct)' },
    { url: 'http://localhost:5173', description: 'Local dev (via Vite proxy)' },
  ],
  tags,
  components: { securitySchemes, schemas },
  paths,
};
