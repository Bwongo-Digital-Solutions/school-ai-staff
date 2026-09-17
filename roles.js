/* A scan shows what the scanner's job needs and no more: the gate sees a gate pass, the
   kitchen a meal card, the dormitories a bio and a room. The server decides which sections
   a profile gets and sends only those, so the card screen renders whatever arrives rather
   than deciding for itself. Roster access and the assistant are the two things still
   judged here.

   This shapes the UI only — the API is unauthenticated, so it is not access control. The
   assistant and search are the exception: they are refused server-side as well. */

export const TABS = ['home', 'scan', 'students', 'assistant', 'profile'];

export const isSupport = (user) => !!user && user.role === 'support_staff';

export const designationOf = (user) => (user && user.designation) || null;

/** Enrolling a student is an office job, as it is in the portal. */
export const canRegisterStudents = (user) => !!user && user.role === 'admin';

/** The gate keeper. Named once here because both the root and Home need to ask. */
export const isAskari = (user) => designationOf(user) === 'askari';

/**
 * The matron, who runs the dormitories.
 *
 * A designation rather than a role: her role is `support_staff`, the same as the cook's and the
 * askari's, so asking about the role alone cannot tell them apart. The server gates her screens the
 * same way, through `requirePost`, reading the designation from her own account rather than from
 * anything this app sends.
 */
export const isMatron = (user) => designationOf(user) === 'matron';

/**
 * The band a class falls in, for the requirements list.
 *
 * The same bands as `levelForGrade` on the server and `inferAcademicLevel` in the report code:
 *
 *     ≤ 0  kindergarten        1–7  primary        8–13  secondary        14+  tertiary
 *
 * Duplicated here because the registration form needs it the moment a class is chosen, before the
 * student exists and before anything can be asked of the server. The server still decides what is
 * actually stored, so this must not drift from it.
 */
export const levelForGrade = (gradeLevel) => {
  const grade = Number(gradeLevel);
  if (!Number.isFinite(grade)) return null;
  if (grade <= 0) return 'kindergarten';
  if (grade <= 7) return 'primary';
  if (grade <= 13) return 'secondary';
  return 'tertiary';
};

/* ------------------------------------------------------------------- what things are called ---

   These were maps of English words, read straight into the UI. They are maps of *message keys*
   now: this module has no `t` — it is imported by plain functions as well as by screens — so it
   names the message and the caller says it.

   `labelKeyFor…` rather than `…_LABELS` so a caller cannot accidentally render the key. */

export const LEVEL_LABEL_KEYS = {
  kindergarten: 'level.kindergarten',
  primary: 'level.primary',
  secondary: 'level.secondary',
  tertiary: 'level.tertiary',
};

/**
 * Who gets the roster, the school figures and the assistant.
 *
 * The server's TEACHING_ROLES exactly (server/auth/roles.mjs). `students` is not listed in
 * DB_TABLE_ROLES, so it falls to DB_DEFAULT_ROLES, which is that list — meaning a head teacher may
 * already read every student record through the API. This check used to name `admin` and `teacher`
 * by hand and so refused them here, which was drift rather than a decision: the head teacher runs
 * the school and is the one role that answers for the whole roll.
 *
 * Named as a list rather than a chain of `||` so the next role added is one edit, and so the thing
 * it has to agree with is written down beside it.
 *
 * `accountant` and `bursar` are absent on purpose. The server leaves them out of TEACHING_ROLES
 * too, so their scan-for-payment-status screen is agreement and not an oversight.
 */
const ROSTER_ROLES = ['admin', 'head_teacher', 'teacher'];

export const hasRoster = (user) => !!user && ROSTER_ROLES.includes(user.role);

/**
 * Who may fetch a document full of other people's children.
 *
 * A report card, a whole record, a broadsheet — each carries marks and, in the case of a record,
 * payment history, for a class at a time. The server gates these routes itself; this is so the app
 * does not offer a button that would only ever come back refused.
 *
 * Narrower than `hasRoster`, which includes the head teacher. That is not an oversight but it is not
 * obviously right either: it matches the note at `api.js`'s `documentUrl`, which is what the server
 * was doing when these screens were written. Worth revisiting with the server's own list rather than
 * widening it here, where the two would then disagree.
 *
 * Written out in `App.js` and again in `StudentCardScreen.js` before this existed; the broadsheet
 * would have been the third copy, which is where a rule earns a name.
 */
const DOCUMENT_ROLES = ['admin', 'teacher'];

export const canPrintDocuments = (user) => !!user && DOCUMENT_ROLES.includes(user.role);

/**
 * May watch the gate: the office, and the gate itself.
 *
 * The twin of GATE_ROLES in the server's `auth/roles.mjs`, and written out here for the same
 * reason the list above is — the server refuses the route regardless, and this only decides
 * whether the app draws a way in. A teacher is not on it: the board carries a child's name and
 * the fact they left the premises, and that is not a teacher's business.
 */
const GATE_ROLES = ['admin', 'head_teacher', 'support_staff'];

export const canWatchGate = (user) => !!user && GATE_ROLES.includes(user.role);

/**
 * Which feature each tab belongs to, mirroring the registry in server/licensing/plans.mjs.
 *
 * `home` and `profile` are absent on purpose, and not by oversight. Home is where a teacher lands and
 * Profile is where they sign out — a school that switched either off would have an app that could not
 * be used or left, and neither is a capability anybody buys. The same reasoning the server uses for
 * leaving signing in ungated.
 */
const TAB_FEATURE = {
  scan: 'scanning',
  students: 'students',
  assistant: 'assistant',
};

/**
 * Whether a feature is on, given what the server said.
 *
 * Unknown resolves to **on**, in every direction: no answer yet, a failed request, a feature this
 * build knows about and that server does not. The server refuses what is off whatever this thinks, so
 * an optimistic answer costs one clear refusal; a pessimistic one hands a teacher an app with no tabs
 * because a request timed out at the gate.
 */
export const featureOn = (features, key) => {
  if (!key || !features) return true;
  const found = features[key];
  return found ? found.allowed !== false : true;
};

/**
 * The tabs this person gets.
 *
 * Two fences, and they are asked in this order because they answer different questions. The role
 * decides what this person may do; the switches decide what this school does at all. A bursar does
 * not get the roster because of the first, and nobody gets the assistant if the school switched it
 * off because of the second.
 *
 * `features` is the `features` map from /api/entitlements, or null before it has been read.
 */
export const allowedTabs = (user, features = null) => {
  const byRole = hasRoster(user) ? TABS : TABS.filter((t) => t !== 'students' && t !== 'assistant');
  return byRole.filter((tab) => featureOn(features, TAB_FEATURE[tab]));
};

/* The six roles the server recognises (server/auth/roles.mjs). The three that were missing here
   rendered as a raw role string — "head_teacher" — on every screen that shows a job title. */
export const ROLE_LABEL_KEYS = {
  admin: 'role.admin',
  head_teacher: 'role.head_teacher',
  accountant: 'role.accountant',
  bursar: 'role.bursar',
  teacher: 'role.teacher',
  support_staff: 'role.support_staff',
};

export const DESIGNATION_LABEL_KEYS = {
  bursar: 'designation.bursar',
  askari: 'designation.askari',
  matron: 'designation.matron',
  cook: 'designation.cook',
};

/**
 * The job title a staff member scans under — the designation when they have one.
 *
 * Takes `t` rather than reaching for it, because this is called from plain code as well as from
 * screens. Returns the raw role as a last resort, which is what it always did: a role the server
 * has and this build does not shows up as itself rather than blank.
 */
export const roleLabel = (user, t) => {
  if (!user) return '';
  const key = DESIGNATION_LABEL_KEYS[user.designation] || ROLE_LABEL_KEYS[user.role];
  return key && t ? t(key) : user.role || '';
};

/** What this profile is for, shown where the blank school figures would otherwise puzzle. */
export const scanPurposeKey = (user) =>
  ({
    askari: 'purpose.askari',
    cook: 'purpose.cook',
    matron: 'purpose.matron',
  }[designationOf(user)] || 'purpose.default');

/* Audiences a message can be addressed to. Roles and designations share one map because
   the compose picker offers them in one list. */
export const AUDIENCE_LABEL_KEYS = {
  all: 'audience.all',
  admin: 'audience.admin',
  head_teacher: 'audience.head_teacher',
  accountant: 'audience.accountant',
  bursar: 'audience.bursar',
  teacher: 'audience.teacher',
  support_staff: 'audience.support_staff',
  askari: 'audience.askari',
  matron: 'audience.matron',
  cook: 'audience.cook',
};

/** An audience in words, falling back to whatever the server called it. */
export const audienceLabel = (value, t, fallback) => {
  const key = AUDIENCE_LABEL_KEYS[value];
  return key && t ? t(key) : fallback ? fallback(value) : String(value || '');
};
