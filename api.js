/* Client for the school-ai-search backend.
   A mirror of the web app's client: the same endpoints, the same argument
   names, the same return shapes. The only differences are storage
   (AsyncStorage rather than localStorage, so the base is hydrated once at
   boot and mirrored synchronously) and the payload scrub below. */

import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_KEY = 'kps.apiBase';
const DEFAULT_BASE = '';
const TIMEOUT = 15000;

/* AsyncStorage is async but call sites need the base synchronously, so the
   stored value is mirrored here and hydrated once at boot. */
let baseUrl = DEFAULT_BASE;

/* A bare host, or `host:port`, is what people actually type. React Native's
   fetch rejects a URL with no scheme outright, and that surfaces as the same
   "cannot reach the server" as a wrong address, so the scheme is filled in
   here. http is the default because a LAN server reached by IP rarely has a
   certificate — note that plain http also needs `usesCleartextTraffic` on the
   Android side, which app.json sets via expo-build-properties. */
function normaliseBase(url) {
  const text = String(url || '').trim().replace(/\/+$/, '');
  if (!text) return '';
  return /^[a-z][a-z0-9+.\-]*:\/\//i.test(text) ? text : `http://${text}`;
}

export const api = {
  base() {
    return baseUrl;
  },
  async load() {
    try {
      baseUrl = (await AsyncStorage.getItem(BASE_KEY)) || DEFAULT_BASE;
    } catch {
      baseUrl = DEFAULT_BASE;
    }
    return baseUrl;
  },
  async setBase(url) {
    const clean = normaliseBase(url);
    baseUrl = clean;
    try {
      await AsyncStorage.setItem(BASE_KEY, clean);
    } catch {
      /* storage unavailable — the in-memory base still applies this session */
    }
    return clean;
  },
  configured() {
    return !!baseUrl;
  },
};

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/* A QR reader, a keyboard wedge or a pasted value can carry NUL and other C0
   control bytes. Postgres rejects NUL in text outright and the rest survive as
   invisible junk in a log somebody has to read later, so every string leaving
   the app is scrubbed of them. Tab, newline and carriage return are kept —
   they are legitimate inside a note. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function scrub(value) {
  if (typeof value === 'string') return value.replace(CONTROL_CHARS, '');
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value).forEach((key) => {
      out[key.replace(CONTROL_CHARS, '')] = scrub(value[key]);
    });
    return out;
  }
  return value;
}

async function request(path, init, { timeout = TIMEOUT } = {}) {
  if (!baseUrl) {
    throw new ApiError('No server configured. Open Server settings and enter your API address.', 0);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  let res;
  try {
    res = await fetch(baseUrl + path, { ...init, signal: ctrl.signal });
  } catch (err) {
    clearTimeout(timer);
    if (err && err.name === 'AbortError') {
      throw new ApiError('The server took too long to respond.', 0);
    }
    throw new ApiError(`Cannot reach ${baseUrl}. Check the address and your connection.`, 0);
  }
  clearTimeout(timer);

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON error page */
  }

  if (!res.ok || (payload && payload.error)) {
    throw new ApiError((payload && payload.error) || `Server error (${res.status})`, res.status);
  }
  return payload ? payload.data : undefined;
}

function post(path, body, options) {
  return request(
    path,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scrub(body || {})),
    },
    options,
  );
}

function get(path, options) {
  return request(path, { method: 'GET' }, options);
}

/* The gateway takes `columns` as a comma-separated string, and only supports
   an `eq` filter operator — no substring matching, which is why name search
   filters client-side over the fetched list. */
function dbSelect({ table, columns, filters = [], orderBy, limit, single = false }) {
  return post('/api/db', {
    table,
    operation: 'select',
    columns: Array.isArray(columns) ? columns.join(',') : columns,
    filters,
    orderBy,
    limit,
    single,
  });
}

const STUDENT_COLUMNS = [
  'id', 'student_id', 'first_name', 'last_name', 'grade_level', 'class_section',
  'gender', 'date_of_birth', 'email', 'phone', 'parent_name', 'parent_phone',
  'parent_email', 'address', 'status', 'gpa', 'attendance_rate', 'blood_group',
  'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
  'lifecycle_status', 'subjects', 'notes', 'enrollment_date',
];

/* React Native's URL has no usable `searchParams`, so the query string and the
   path are picked apart by hand. The result is the same as the web client's
   for every input the two share. */
function fromUrl(text) {
  const match = text.match(/^https?:\/\/[^/?#]*([^?#]*)(?:\?([^#]*))?/i);
  if (!match) return '';
  const path = match[1] || '';
  const query = match[2] || '';

  const params = {};
  query.split('&').forEach((pair) => {
    if (!pair) return;
    const eq = pair.indexOf('=');
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawValue = eq === -1 ? '' : pair.slice(eq + 1);
    try {
      params[decodeURIComponent(rawKey.replace(/\+/g, ' '))] =
        decodeURIComponent(rawValue.replace(/\+/g, ' '));
    } catch {
      /* a malformed escape means this pair is not the one we want */
    }
  });

  const fromQuery = params.student_id || params.studentId || params.id;
  if (fromQuery) return fromQuery.trim();

  const lastSegment = path.split('/').filter(Boolean).pop();
  if (lastSegment) {
    try {
      return decodeURIComponent(lastSegment).trim();
    } catch {
      return lastSegment.trim();
    }
  }
  return '';
}

/**
 * Normalises a scanned ID card payload down to the student number.
 * Mirrors `parseStudentCode` in the backend — keep the two in step. The server re-parses
 * whatever it receives, so this copy only shortens the round trip for manual entry.
 */
export function parseStudentCode(raw) {
  const text = String(raw == null ? '' : raw).trim();
  if (!text) return '';

  if (text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      const fromJson = parsed.student_id || parsed.studentId || parsed.id || parsed.code;
      if (fromJson) return String(fromJson).trim();
    } catch {
      /* treat as plain text */
    }
  }

  if (/^https?:\/\//i.test(text)) {
    const fromLink = fromUrl(text);
    if (fromLink) return fromLink;
  }

  return text;
}

/* The PDF routes take the caller's role as a query parameter rather than in a body, and
   only 'admin' or 'teacher' may fetch one. A bursar signs in as an admin, so this is the
   same value the rest of the app already holds. */
export function documentUrl(path, params = {}) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return `${baseUrl}${path}${query ? `?${query}` : ''}`;
}

/** Where the parent report for one student lives, with only the sections asked for. */
export const reportUrl = ({ code, sections, requesterRole, actorName }) =>
  documentUrl(`/api/students/${encodeURIComponent(code)}/report.pdf`, {
    sections: Array.isArray(sections) ? sections.join(',') : sections,
    requesterRole,
    actorName,
  });

/** The receipt already issued for one payment. Keyed by the payment, not the receipt. */
export const receiptUrl = ({ paymentId, requesterRole }) =>
  documentUrl(`/api/fees/receipts/${encodeURIComponent(paymentId)}.pdf`, { requesterRole });

export const schoolApi = {
  health: () => get('/api/health'),

  /* The school's own name, tagline and logo, set by an admin in the web app under
     Settings -> Branding. Reads are open to any caller — only `update` is admin-gated —
     so the sign-in screen can brand itself before anyone has signed in. */
  schoolSettings: () =>
    post('/api/functions/settings', { action: 'get' }).then((d) => (d && d.settings) || null),

  signIn: (email, password) =>
    post('/api/functions/auth', { action: 'signin', email, password })
      .then((d) => (d ? d.user : null)),

  /** The scan payload, already trimmed by the server to this profile's sections. */
  studentCard: (code, role, designation) =>
    post('/api/functions/student-card', { code, role, designation }),

  /* permissionId names the exact slip being answered. Without it the server falls back to the
     newest open one for that student, which is right for a bare scan but wrong when two are
     open at once — the other would be left active with nothing able to clear it. */
  recordGatePass: ({
    code, direction, decision, authorisedBy, reason, destination, note, recordedBy, permissionId,
  }) =>
    post('/api/functions/gate-pass', {
      code, direction, decision, authorisedBy, reason, destination, note, recordedBy, permissionId,
    }),

  /* Every slip still open and still in date: granted, not yet acted on at the gate, and not
     cancelled by whoever wrote it. Deliberately not scoped to today — a student cleared to
     leave late in the evening should not vanish from the gate's list at midnight. */
  pendingGatePasses: () =>
    post('/api/functions/gate-permission', { action: 'pending' }).then((d) => (d && d.pending) || []),

  grantGatePermission: ({ code, reason, destination, expectedReturn, grantedBy, grantedByEmail }) =>
    post('/api/functions/gate-permission', {
      action: 'grant', code, reason, destination, expectedReturn, grantedBy, grantedByEmail,
    }),

  cancelGatePermission: ({ permissionId, by }) =>
    post('/api/functions/gate-permission', { action: 'cancel', permissionId, by }),

  /** The gate's movement log: who went which way, when, and whether they were let through. */
  gateLog: ({ date, limit } = {}) => post('/api/functions/gate-log', { date, limit }),

  inbox: ({ actorEmail, limit } = {}) =>
    post('/api/functions/messages', { action: 'inbox', actorEmail, limit }),

  staffDirectory: ({ actorEmail }) =>
    post('/api/functions/messages', { action: 'staff', actorEmail }),

  sendMessage: ({ actorEmail, audienceKind, audienceValue, recipientEmail, subject, body, priority }) =>
    post('/api/functions/messages', {
      action: 'send', actorEmail, audienceKind, audienceValue, recipientEmail, subject, body, priority,
    }),

  markMessageRead: ({ actorEmail, messageId }) =>
    post('/api/functions/messages', { action: 'read', actorEmail, messageId }),

  markAllMessagesRead: ({ actorEmail }) =>
    post('/api/functions/messages', { action: 'read_all', actorEmail }),

  rollCallClasses: () =>
    post('/api/functions/roll-call', { action: 'classes' }).then((d) => (d && d.classes) || []),

  rollCallRegister: ({ gradeLevel, classSection, date }) =>
    post('/api/functions/roll-call', { action: 'register', gradeLevel, classSection, date }),

  markAttendance: ({ code, status, date, reason, markedBy }) =>
    post('/api/functions/roll-call', { action: 'mark', code, status, date, reason, markedBy }),

  grantExamClearance: ({ code, note, grantedBy, grantedByEmail, validUntil }) =>
    post('/api/functions/exam-clearance', {
      action: 'grant', code, note, grantedBy, grantedByEmail, validUntil,
    }),

  revokeExamClearance: ({ clearanceId, by }) =>
    post('/api/functions/exam-clearance', { action: 'revoke', clearanceId, by }),

  /** The invigilator's verdict at the exam room door. */
  admitToExam: ({ code, decision, note, recordedBy }) =>
    post('/api/functions/exam-clearance', { action: 'admit', code, decision, note, recordedBy }),

  /* The assistant and search are refused server-side for anyone but an admin or teacher,
     so `requesterRole` is passed through rather than trusted from the UI alone. */
  aiModels: () => post('/api/functions/ai-models', {}).then((d) => (d && d.models) || []),

  aiChat: ({ message, conversationId, modelId, requesterRole, actorName, actorEmail }) =>
    post('/api/functions/ai-chat', {
      message, conversationId, modelId, requesterRole, actorName, actorEmail,
    }, { timeout: 60000 }),

  search: ({ query, requesterRole, actorName, actorEmail, limit }) =>
    post('/api/functions/search', {
      action: 'query', query, requesterRole, actorName, actorEmail, limit,
    }, { timeout: 25000 }),

  /* A report leaves the phone through the share sheet, so the server is told afterwards
     that it went — that is the only way a WhatsApp hand-over reaches the log at all. */
  sendReportEmail: ({ code, to, sections, requesterRole, actorName, actorEmail }) =>
    post('/api/functions/student-report', {
      action: 'send_email', code, to, sections, requesterRole, actorName, actorEmail,
    }, { timeout: 60000 }),

  recordReportShare: ({ code, channel, target, sections, requesterRole, actorName, actorEmail }) =>
    post('/api/functions/student-report', {
      action: 'record_share', code, channel, target, sections, requesterRole, actorName, actorEmail,
    }),

  lastReportSent: ({ code, requesterRole }) =>
    post('/api/functions/student-report', { action: 'last_sent', code, requesterRole })
      .then((d) => (d && d.last_sent) || null),

  recordMeal: ({ code, meal, servedBy }) =>
    post('/api/functions/meal-record', { code, meal, servedBy }),

  listStudents: () =>
    dbSelect({
      table: 'students',
      columns: STUDENT_COLUMNS,
      orderBy: { field: 'last_name', ascending: true },
    }),

  /** Looks up by the human-facing student number (e.g. STU-2026-011). */
  studentByNumber: (studentNumber) =>
    dbSelect({
      table: 'students',
      columns: STUDENT_COLUMNS,
      filters: [{ field: 'student_id', operator: 'eq', value: studentNumber }],
      single: true,
    }),

  studentById: (id) =>
    dbSelect({
      table: 'students',
      columns: STUDENT_COLUMNS,
      filters: [{ field: 'id', operator: 'eq', value: id }],
      single: true,
    }),

  feeStatus: () =>
    post('/api/functions/fee-status', {}).then((d) => (d && d.students) || []),

  invoicesFor: (studentId) =>
    dbSelect({
      table: 'invoices',
      columns: ['id', 'invoice_number', 'status', 'total_amount', 'balance_due', 'currency', 'due_date', 'issued_at'],
      filters: [{ field: 'student_id', operator: 'eq', value: studentId }],
    }),

  paymentsFor: (studentId) =>
    dbSelect({
      table: 'payments',
      columns: ['id', 'amount', 'currency', 'paid_at', 'payment_method', 'reference'],
      filters: [{ field: 'student_id', operator: 'eq', value: studentId }],
      orderBy: { field: 'paid_at', ascending: false },
    }),

  attendanceFor: (studentId) =>
    dbSelect({
      table: 'attendance_records',
      columns: ['id', 'attendance_date', 'status', 'reason'],
      filters: [{ field: 'student_id', operator: 'eq', value: studentId }],
      orderBy: { field: 'attendance_date', ascending: false },
      limit: 40,
    }),

  gradesFor: (studentId) =>
    dbSelect({
      table: 'gradebook_entries',
      columns: ['id', 'exam_id', 'subject_id', 'score', 'max_score', 'grade', 'remarks', 'rank'],
      filters: [{ field: 'student_id', operator: 'eq', value: studentId }],
    }),

  disciplineFor: (studentId) =>
    dbSelect({
      table: 'discipline_records',
      columns: ['id', 'incident_date', 'category', 'severity', 'description', 'action_taken', 'status'],
      filters: [{ field: 'student_id', operator: 'eq', value: studentId }],
      orderBy: { field: 'incident_date', ascending: false },
    }),
};

export { ApiError };
