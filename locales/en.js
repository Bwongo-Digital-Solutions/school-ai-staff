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
  /* ── the report screen: one student's documents ─────────────────────────── */
  'report.title': 'Send a report',
  'report.whichDocument': 'Which document',
  'report.documentRecord': 'The whole record',
  'report.documentRecordHint': 'Marks, attendance, fees and details, in the parts you choose',
  'report.documentCard': 'Report card',
  'report.documentCardHint': "This term's marks, laid out as a report card",
  'report.whatToInclude': 'What to include',
  'report.sectionPerformance': 'Academic performance',
  'report.sectionPerformanceHint': 'Subject marks, grades and the average',
  'report.sectionAttendance': 'Attendance',
  'report.sectionAttendanceHint': 'Rate, days present and days missed',
  'report.sectionFees': 'Fees',
  'report.sectionFeesHint': 'What has been billed and what is outstanding',
  'report.sectionPayments': 'Payment history',
  'report.sectionPaymentsHint': 'Every payment recorded, with receipt numbers',
  'report.sectionInfo': 'Student details',
  'report.sectionInfoHint': 'Date of birth, guardian and emergency contact',
  'report.sendIt': 'Send it',
  'report.printWhat': "Print opens this phone's print dialog, where any printer it knows about sits alongside Save as PDF.",
  'report.print': 'Print',
  'report.shareWhat': "Share opens this phone's share sheet, where WhatsApp sits alongside everything else.",
  'report.share': 'Share',
  'report.preparing': 'Preparing…',
  'report.parentEmail': 'Parent email',
  'report.parentEmailHint': 'parent@example.com',
  'report.email': 'Email the report',
  'report.sending': 'Sending…',
  'report.cardNoEmail': 'A report card is shared or printed. Choose the whole record to email one.',
  'report.chooseSection': 'Choose at least one section to include.',
  'report.enterEmail': "Enter the parent's email address.",
  'report.handedOver': 'Report handed over',
  'report.handedOverWhere': "Saved to this student's record",
  'report.notShared': 'Not shared',
  'report.shareFailed': 'The report could not be shared.',
  'report.notPrinted': 'Not printed',
  'report.printFailed': 'The report could not be printed.',
  'report.emailed': 'Report emailed',
  'report.notEmailed': 'Not emailed',
  'report.emailFailed': 'The report could not be emailed.',
  'report.lastEmailed': 'Last report emailed {when} by {who}',
  'report.lastHandedOver': 'Last report handed over {when} by {who}',
  'report.noneYet': 'No report has been sent to this family yet.',

  /* ── recording marks ────────────────────────────────────────────────────── */
  'marks.title': 'Record marks',
  'marks.loadingClasses': 'Loading your classes…',
  'marks.noClasses':
    'You have no classes assigned yet. An administrator gives you one on the web app under '
    + 'Users — open your name and choose Classes — and it appears here.',
  'marks.classAndSubject': 'Class and subject',
  'marks.chooseClass': 'Choose a class…',
  'marks.classOption': '{class} ({subject})',
  'marks.loadingClass': 'Loading the class…',

  'marks.modeType': 'Type',
  'marks.modePhoto': 'Photograph',
  'marks.modeFile': 'File',

  'marks.photoHint':
    'Photograph a mark sheet and the marks are read off it. You check them before anything is saved.',
  'marks.openCamera': 'Open the camera',
  'marks.openSettings': 'Open settings',
  'marks.allowCamera': 'Allow the camera',
  'marks.photographTitle': 'Photograph the sheet',
  'marks.framingHint': 'Fill the frame with the sheet. Names on the left, marks on the right.',
  'marks.takePicture': 'Take the picture',
  'marks.cameraFailed': 'The camera could not take that picture.',

  'marks.fileHint': 'A spreadsheet, a Word file or a PDF. Names in one column, marks in another.',
  'marks.chooseFile': 'Choose a file',
  'marks.reading': 'Reading the sheet…',
  'marks.fileUnreadable': 'That file could not be read.',
  'marks.notRead': 'Not read',
  'marks.fileUnopenable': 'That file could not be opened.',

  'marks.needsChecking': {
    one: '{count} row needs checking. Nothing is saved yet.',
    other: '{count} rows need checking. Nothing is saved yet.',
  },
  'marks.checkThese': 'Check these, then save. Nothing is saved yet.',
  'marks.unnamed': 'Unnamed',
  'marks.readAs': 'Read as “{name}” — {match}',
  'marks.notOnTheSheet': 'Not on the sheet',

  'marks.nothingToSave': 'There are no marks to save yet.',
  'marks.saving': 'Saving…',
  'marks.save': { one: 'Save {count} mark', other: 'Save {count} marks' },
  'marks.unconfirmed': 'The server did not confirm the marks. Nothing was saved.',
  'marks.saved': 'Marks saved',
  /* The subject follows a colon rather than sitting inside the sentence. French would otherwise need
     a participle agreeing with an interpolated noun it cannot see. */
  'marks.savedCount': {
    one: '{count} recorded in {subject}',
    other: '{count} recorded in {subject}',
  },
  'marks.notSaved': 'Not saved',
  'marks.saveFailed': 'Those marks were not saved.',

  'marks.building': 'Building…',
  'marks.printClass': 'Print this class',
  'marks.notPrinted': 'Not printed',
  'marks.printFailed': 'That table could not be printed.',

  /* ── a whole class's documents ──────────────────────────────────────────── */
  'printClass.title': 'Print a class',
  'printClass.whichClass': 'Which class',
  'printClass.loading': 'Loading classes…',
  'printClass.loadFailed': 'The classes could not be loaded.',
  'printClass.noClasses': 'No classes have been set up yet.',
  'printClass.className': 'Class {grade} {section}',
  'printClass.studentCount': { one: '{count} student', other: '{count} students' },
  'printClass.whichDocument': 'Which document',
  'printClass.documentCards': 'Report cards',
  'printClass.documentCardsHint': "This term's marks, one card per student",
  'printClass.documentRecords': 'Whole records',
  'printClass.documentRecordsHint': 'Marks, attendance, fees and details — several pages each',
  'printClass.documentMarks': 'Marks table',
  'printClass.documentMarksHint': 'One row per student, a column per subject — one page per class',
  'printClass.howMuch': 'How much of it',
  'printClass.thisStream': 'This stream only',
  'printClass.thisStreamHint': 'One table, for the class you chose',
  'printClass.everyStream': 'Every stream in this grade',
  'printClass.everyStreamHint': 'One table per stream, each on its own page',
  'printClass.whichExam': 'Which marks',
  'printClass.examsLoading': 'Looking for recorded marks…',
  'printClass.noMarks': 'No marks have been recorded for this class yet.',
  'printClass.examEntries': { one: '{count} mark recorded', other: '{count} marks recorded' },
  'printClass.chooseExam': 'Choose which marks to print.',
  'printClass.sendIt': 'Print it',
  'printClass.chooseClass': 'Choose a class first.',
  'printClass.about': {
    one: 'One student, so this will be quick.',
    other: '{count} students. A set this size takes a moment to build.',
  },
  'printClass.classEmpty': 'This class has nobody in it yet.',
  'printClass.building': 'Building…',
  'printClass.print': 'Print the set',
  'printClass.share': 'Share the set',
  'printClass.notDone': 'Not printed',
  'printClass.failed': 'That set could not be built.',

  /* ── the students tab ───────────────────────────────────────────────────── */
  'students.search': 'Search name, ID or guardian',
  'students.enrolled': { one: '{count} enrolled', other: '{count} enrolled' },
  'students.matching': { one: '{count} of {total}', other: '{count} of {total}' },

  /* ── a newer build is out ───────────────────────────────────────────────── */
  'update.available': 'Version {version} is available',
  'update.installed': 'You have {version}.',
  'update.install': 'Install it',
  'update.dismiss': 'Not now',

  /* ── the home screen's own actions ────────────────────────── */
  'home.overview': 'School overview',
  'home.students': 'Students',
  'home.attendanceToday': "Attendance today",
  'home.feesOwing': 'Fees owing',
  'home.passRate': 'Pass rate',
  'home.dormitories': 'Dormitories',
  'home.callRegister': 'Call the register',
  'home.recordMarks': 'Record marks',
  'home.registerStudent': 'Register a student',
  'home.recentStudents': 'Recent students',

  /* The outbox: work done without a signal, waiting to reach the server. */
  'sync.waiting': { one: '{count} thing waiting to be sent', other: '{count} things waiting to be sent' },
  'sync.explain': 'Saved on this phone. It will be sent when the network comes back.',
  'sync.retry': 'Try now',
  'sync.queued': 'Saved on this phone',
  'sync.queuedDetail': 'No network just now. It will be sent when the signal comes back.',
};

export default en;
