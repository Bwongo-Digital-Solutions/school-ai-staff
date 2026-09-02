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

export const LEVEL_LABELS = {
  kindergarten: 'Kindergarten',
  primary: 'Primary',
  secondary: 'Secondary',
  tertiary: 'Tertiary',
};

/** Only an admin or a teacher gets the roster, the school figures and the assistant. */
export const hasRoster = (user) =>
  !!user && (user.role === 'admin' || user.role === 'teacher');

export const allowedTabs = (user) =>
  (hasRoster(user) ? TABS : TABS.filter((t) => t !== 'students' && t !== 'assistant'));

/* The six roles the server recognises (server/auth/roles.mjs). The three that were missing here
   rendered as a raw role string — "head_teacher" — on every screen that shows a job title. */
export const ROLE_LABELS = {
  admin: 'Administrator',
  head_teacher: 'Head Teacher',
  accountant: 'Accountant',
  bursar: 'Bursar',
  teacher: 'Teacher',
  support_staff: 'Support staff',
};

export const DESIGNATION_LABELS = {
  bursar: 'Bursar',
  askari: 'Gate keeper',
  matron: 'Matron',
  cook: 'Cook',
};

/** The job title a staff member scans under — the designation when they have one. */
export const roleLabel = (user) => {
  if (!user) return '';
  return DESIGNATION_LABELS[user.designation] || ROLE_LABELS[user.role] || user.role || '';
};

/** What this profile is for, shown where the blank school figures would otherwise puzzle. */
export const scanPurpose = (user) =>
  ({
    askari: 'Scan a student ID card to check their gate pass.',
    cook: 'Scan a student ID card to check and record meals.',
    matron: 'Scan a student ID card to see their dormitory and contacts.',
  }[designationOf(user)] || 'Scan a student ID card to check their payment status.');

/* Audiences a message can be addressed to. Roles and designations share one map because
   the compose picker offers them in one list. */
export const AUDIENCE_LABELS = {
  all: 'All staff',
  admin: 'Administrators',
  head_teacher: 'Head Teacher',
  accountant: 'Accountants',
  bursar: 'Bursar',
  teacher: 'Teachers',
  support_staff: 'Support staff',
  askari: 'Gate keepers',
  matron: 'Matrons',
  cook: 'Kitchen',
};
