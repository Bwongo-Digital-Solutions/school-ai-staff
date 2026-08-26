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

/** Only an admin or a teacher gets the roster, the school figures and the assistant. */
export const hasRoster = (user) =>
  !!user && (user.role === 'admin' || user.role === 'teacher');

export const allowedTabs = (user) =>
  (hasRoster(user) ? TABS : TABS.filter((t) => t !== 'students' && t !== 'assistant'));

export const ROLE_LABELS = {
  admin: 'Administrator',
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
  teacher: 'Teachers',
  support_staff: 'Support staff',
  bursar: 'Bursar',
  askari: 'Gate keepers',
  matron: 'Matrons',
  cook: 'Kitchen',
};
