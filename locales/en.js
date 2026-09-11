/**
 * Every string the staff app shows, in English. The source of truth: `fr.js` falls back to this,
 * key by key, so a screen with no French yet reads exactly as it always did.
 *
 * Counted messages are written as `{ one, other }` rather than with a number formatted in,
 * because English and French disagree about zero.
 *
 * The `enum.*` keys are values the server stores as snake_case. They used to reach the screen
 * through `humanise`, which made English prose out of them and so could not be translated;
 * `labelOf` in i18n.js looks them up here and still falls back to `humanise` for anything this
 * build has not heard of.
 */
export const en = {
  /* ------------------------------------------------------------------------- everyday words -- */
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.ok': 'OK',
  'common.change': 'Change',
  'common.refresh': 'Refresh',
  'common.tryAgain': 'Try again',
  'common.signOut': 'Sign out',
  'common.notConfigured': 'Not configured',
  'common.somethingWrong': 'Something went wrong.',

  /* ------------------------------------------------------------------------------- the tabs -- */
  'tab.home': 'Home',
  'tab.scan': 'Scan',
  'tab.students': 'Students',
  'tab.assistant': 'Assistant',
  'tab.profile': 'Profile',

  /* ------------------------------------------------------------------------------- the alerts */
  'alert.done': 'Done',
  'alert.nothingToDo': 'Nothing to do',
  'alert.failed': 'Failed',

  /* ------------------------------------------------------------------------------ the profile */
  'profile.title': 'Profile',
  'profile.notSignedIn': 'Not signed in',
  'profile.lightTheme': 'Light theme',
  'profile.lightThemeWhy': 'Switch between the dark and light palette',
  'profile.language': 'Language',
  'profile.languageWhy': 'English or French, across the whole app',
  'profile.server': 'Server',
  'profile.access': 'Access',
  'profile.refreshData': 'Refresh data',
  'profile.cached': { one: '{count} student cached', other: '{count} students cached' },
  'profile.refreshed': 'Data refreshed.',
  'profile.refreshFailed': 'Refresh failed.',
  'profile.staffApp': 'Staff App',

  /* ------------------------------------------------------------------------------- the posts - */
  'role.admin': 'Administrator',
  'role.head_teacher': 'Head Teacher',
  'role.accountant': 'Accountant',
  'role.bursar': 'Bursar',
  'role.teacher': 'Teacher',
  'role.support_staff': 'Support staff',

  'designation.bursar': 'Bursar',
  'designation.askari': 'Gate keeper',
  'designation.matron': 'Matron',
  'designation.cook': 'Cook',

  'level.kindergarten': 'Kindergarten',
  'level.primary': 'Primary',
  'level.secondary': 'Secondary',
  'level.tertiary': 'Tertiary',

  'audience.all': 'All staff',
  'audience.admin': 'Administrators',
  'audience.head_teacher': 'Head Teacher',
  'audience.accountant': 'Accountants',
  'audience.bursar': 'Bursar',
  'audience.teacher': 'Teachers',
  'audience.support_staff': 'Support staff',
  'audience.askari': 'Gate keepers',
  'audience.matron': 'Matrons',
  'audience.cook': 'Kitchen',

  /* What a scan is for, which differs by job and is the only thing on an otherwise blank screen. */
  'purpose.askari': 'Scan a student ID card to check their gate pass.',
  'purpose.cook': 'Scan a student ID card to check and record meals.',
  'purpose.matron': 'Scan a student ID card to see their dormitory and contacts.',
  'purpose.default': 'Scan a student ID card to check their payment status.',

  'messages.direct': 'Direct',
  'messages.system': 'System',
  'messages.staff': 'Staff',
  'register.requirements': 'Requirements',

  'movement.declined': 'Declined',

  /* -------------------------------------------------------------- values the server stores --- */
  'enum.active': 'Active',
  'enum.inactive': 'Inactive',
  'enum.graduated': 'Graduated',
  'enum.transferred': 'Transferred',
  'enum.suspended': 'Suspended',

  'enum.present': 'Present',
  'enum.absent': 'Absent',
  'enum.late': 'Late',
  'enum.excused': 'Excused',

  'enum.breakfast': 'Breakfast',
  'enum.lunch': 'Lunch',
  'enum.supper': 'Supper',

  'enum.cleared': 'Cleared',
  'enum.partial': 'Part paid',
  'enum.unpaid': 'Unpaid',
  'enum.overdue': 'Overdue',
  'enum.no_invoices': 'No invoice',

  'enum.brought': 'Brought',
  'enum.waived': 'Waived',
  'enum.pending': 'Still owing',

  'enum.in': 'In',
  'enum.out': 'Out',
  'enum.approved': 'Approved',
  'enum.denied': 'Turned back',
  'enum.expired': 'Expired',
};

export default en;
