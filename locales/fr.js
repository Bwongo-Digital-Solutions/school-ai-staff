/**
 * French. Anything absent falls back to the English in `en.js`, so this file may be incomplete
 * without breaking a screen.
 *
 * **Lines marked `CHECK` are the ones to correct first.** They are school terms, and East African
 * school French is not French-French — what a Ugandan, Rwandan or Congolese school calls its bursar
 * or its school fees is a local matter this file cannot settle.
 *
 * Gender is avoided rather than guessed wherever the phrasing allows it, because these screens are
 * read by the whole staff and a wrong agreement misgenders half of them. Where a job title has no
 * neutral form the generic masculine is used, as French interfaces conventionally do.
 *
 * ` ` is a non-breaking space, written as an escape so it is visible in review. French
 * typography puts one before `?`, `!`, `:` and `;`.
 */
export const fr = {
  /* ------------------------------------------------------------------------- everyday words -- */
  'common.cancel': 'Annuler',
  'common.save': 'Enregistrer',
  'common.ok': 'OK',
  'common.change': 'Modifier',
  'common.refresh': 'Actualiser',
  'common.tryAgain': 'Réessayer',
  'common.signOut': 'Se déconnecter',
  'common.notConfigured': 'Non configuré',
  'common.somethingWrong': "Une erreur s'est produite.",

  /* ------------------------------------------------------------------------------- the tabs -- */
  'tab.home': 'Accueil',
  'tab.scan': 'Scanner',
  'tab.students': 'Élèves',
  'tab.assistant': 'Assistant',
  'tab.profile': 'Profil',

  /* ------------------------------------------------------------------------------- the alerts */
  'alert.done': 'Terminé',
  'alert.nothingToDo': 'Rien à faire',
  'alert.failed': 'Échec',

  /* ------------------------------------------------------------------------------ the profile */
  'profile.title': 'Profil',
  'profile.notSignedIn': 'Non connecté',
  'profile.lightTheme': 'Thème clair',
  'profile.lightThemeWhy': 'Basculer entre la palette sombre et la palette claire',
  'profile.language': 'Langue',
  'profile.languageWhy': "Français ou anglais, dans toute l'application",
  'profile.server': 'Serveur',
  'profile.access': 'Accès',
  'profile.refreshData': 'Actualiser les données',
  'profile.cached': {
    one: '{count} élève en mémoire',
    other: '{count} élèves en mémoire',
  },
  'profile.refreshed': 'Données actualisées.',
  'profile.refreshFailed': "L'actualisation a échoué.",
  'profile.staffApp': 'Application du personnel',

  /* ------------------------------------------------------------------------------- the posts - */
  // CHECK, all six: job titles are what a school's own staff call themselves, and they vary by
  // country.
  'role.admin': 'Administrateur',
  'role.head_teacher': 'Directeur', // CHECK: "Directeur" vs "Préfet des études"
  'role.accountant': 'Comptable',
  'role.bursar': 'Économe', // CHECK: "Économe" vs "Intendant" vs "Trésorier"
  'role.teacher': 'Enseignant',
  'role.support_staff': "Personnel d'appui",

  'designation.bursar': 'Économe', // CHECK: see role.bursar
  'designation.askari': 'Gardien', // CHECK: "askari" is the word actually used in Uganda
  'designation.matron': 'Intendante', // CHECK: the matron who runs the dormitories
  'designation.cook': 'Cuisinier',

  'level.kindergarten': 'Maternelle',
  'level.primary': 'Primaire',
  'level.secondary': 'Secondaire',
  'level.tertiary': 'Supérieur',

  'audience.all': 'Tout le personnel',
  'audience.admin': 'Administrateurs',
  'audience.head_teacher': 'Directeur', // CHECK: see role.head_teacher
  'audience.accountant': 'Comptables',
  'audience.bursar': 'Économe', // CHECK: see role.bursar
  'audience.teacher': 'Enseignants',
  'audience.support_staff': "Personnel d'appui",
  'audience.askari': 'Gardiens', // CHECK: see designation.askari
  'audience.matron': 'Intendantes', // CHECK: see designation.matron
  'audience.cook': 'Cuisine',

  'purpose.askari':
    "Scannez la carte d'un élève pour vérifier son autorisation de sortie.",
  'purpose.cook': "Scannez la carte d'un élève pour vérifier et enregistrer les repas.",
  'purpose.matron':
    "Scannez la carte d'un élève pour voir son dortoir et ses contacts.",
  'purpose.default': "Scannez la carte d'un élève pour vérifier l'état de ses paiements.",

  'messages.direct': 'Direct',
  'messages.system': 'Système',
  'messages.staff': 'Personnel',
  'register.requirements': 'Fournitures',

  'movement.declined': 'Refusé',

  /* -------------------------------------------------------------- values the server stores --- */
  'enum.active': 'Actif',
  'enum.inactive': 'Inactif',
  'enum.graduated': 'Diplômé',
  'enum.transferred': 'Transféré',
  'enum.suspended': 'Suspendu',

  'enum.present': 'Présent',
  'enum.absent': 'Absent',
  'enum.late': 'En retard',
  'enum.excused': 'Excusé',

  'enum.breakfast': 'Petit-déjeuner',
  'enum.lunch': 'Déjeuner',
  'enum.supper': 'Dîner',

  'enum.cleared': 'À jour',
  'enum.partial': 'Partiellement payé',
  'enum.unpaid': 'Impayé',
  'enum.overdue': 'En retard',
  'enum.no_invoices': 'Aucune facture',

  'enum.brought': 'Apporté',
  'enum.waived': 'Dispensé',
  'enum.pending': 'Encore dû',

  'enum.in': 'Entrée',
  'enum.out': 'Sortie',
  'enum.approved': 'Autorisé',
  'enum.denied': 'Refusé',
  'enum.expired': 'Expiré',
  /* ── the report screen: one student's documents ─────────────────────────── */
  'report.title': 'Envoyer un bulletin',
  'report.whichDocument': 'Quel document',
  'report.documentRecord': 'Le dossier complet',
  'report.documentRecordHint': 'Notes, présences, frais et coordonnées, dans les parties que vous choisissez',
  'report.documentCard': 'Bulletin de notes',
  'report.documentCardHint': 'Les notes de ce trimestre, présentées en bulletin',
  'report.whatToInclude': "Ce qu'il faut inclure",
  'report.sectionPerformance': 'Résultats scolaires',
  'report.sectionPerformanceHint': 'Notes par matière, appréciations et moyenne',
  'report.sectionAttendance': 'Présences',
  'report.sectionAttendanceHint': 'Taux, jours de présence et jours manqués',
  'report.sectionFees': 'Frais scolaires',
  'report.sectionFeesHint': 'Ce qui a été facturé et ce qui reste dû',
  'report.sectionPayments': 'Historique des paiements',
  'report.sectionPaymentsHint': 'Chaque paiement enregistré, avec les numéros de reçu',
  'report.sectionInfo': "Coordonnées de l'élève",
  'report.sectionInfoHint': "Date de naissance, tuteur et contact en cas d'urgence",
  'report.sendIt': 'Envoyer',
  'report.printWhat':
    "Imprimer ouvre la boîte d'impression du téléphone, où figurent les imprimantes connues ainsi "
    + 'que Enregistrer en PDF.',
  'report.print': 'Imprimer',
  'report.shareWhat':
    "Partager ouvre le menu de partage du téléphone, où WhatsApp figure parmi les autres applications.",
  'report.share': 'Partager',
  'report.preparing': 'Préparation…',
  'report.parentEmail': 'Courriel du parent',
  'report.parentEmailHint': 'parent@exemple.com',
  'report.email': 'Envoyer par courriel',
  'report.sending': 'Envoi…',
  'report.cardNoEmail':
    "Un bulletin de notes se partage ou s'imprime. Choisissez le dossier complet pour en envoyer "
    + 'un par courriel.',
  'report.chooseSection': 'Choisissez au moins une partie à inclure.',
  'report.enterEmail': 'Saisissez le courriel du parent.',
  'report.handedOver': 'Bulletin remis',
  'report.handedOverWhere': "Enregistré au dossier de l'élève",
  'report.notShared': 'Non partagé',
  'report.shareFailed': "Le bulletin n'a pas pu être partagé.",
  'report.notPrinted': 'Non imprimé',
  'report.printFailed': "Le bulletin n'a pas pu être imprimé.",
  'report.emailed': 'Bulletin envoyé par courriel',
  'report.notEmailed': 'Non envoyé',
  'report.emailFailed': "Le bulletin n'a pas pu être envoyé par courriel.",
  'report.lastEmailed': 'Dernier bulletin envoyé par courriel {when} par {who}',
  'report.lastHandedOver': 'Dernier bulletin remis {when} par {who}',
  'report.noneYet': "Aucun bulletin n'a encore été envoyé à cette famille.",

  /* ── a whole class's documents ──────────────────────────────────────────── */
  'printClass.title': 'Imprimer une classe',
  'printClass.whichClass': 'Quelle classe',
  'printClass.loading': 'Chargement des classes…',
  'printClass.loadFailed': "Les classes n'ont pas pu être chargées.",
  'printClass.noClasses': "Aucune classe n'a encore été créée.",
  'printClass.className': 'Classe {grade} {section}',
  'printClass.studentCount': { one: '{count} élève', other: '{count} élèves' },
  'printClass.whichDocument': 'Quel document',
  'printClass.documentCards': 'Bulletins de notes',
  'printClass.documentCardsHint': 'Les notes de ce trimestre, un bulletin par élève',
  'printClass.documentRecords': 'Dossiers complets',
  'printClass.documentRecordsHint':
    'Notes, présences, frais et coordonnées — plusieurs pages chacun',
  'printClass.sendIt': 'Imprimer',
  'printClass.chooseClass': "Choisissez d'abord une classe.",
  'printClass.about': {
    one: 'Un seul élève, ce sera rapide.',
    other: '{count} élèves. Un jeu de cette taille met un moment à se construire.',
  },
  'printClass.classEmpty': "Cette classe n'a encore aucun élève.",
  'printClass.building': 'Construction…',
  'printClass.print': 'Imprimer le jeu',
  'printClass.share': 'Partager le jeu',
  'printClass.notDone': 'Non imprimé',
  'printClass.failed': "Ce jeu n'a pas pu être construit.",

  /* ── the students tab ───────────────────────────────────────────────────── */
  'students.search': 'Rechercher un nom, un identifiant ou un tuteur',
  'students.enrolled': { one: '{count} inscrit', other: '{count} inscrits' },
  'students.matching': { one: '{count} sur {total}', other: '{count} sur {total}' },

  /* ── a newer build is out ───────────────────────────────────────────────── */
  'update.available': 'La version {version} est disponible',
  'update.installed': 'Vous avez la version {version}.',
  'update.install': "L'installer",
  'update.dismiss': 'Pas maintenant',

};

export default fr;
