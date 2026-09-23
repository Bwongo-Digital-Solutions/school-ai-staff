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
  'tab.child': 'Mon enfant',

  /* ------------------------------------------------------- l'espace parents --- */
  'role.parent': 'Parent ou tuteur',
  'curriculum.title': 'Guide du programme',
  'curriculum.subtitle':
    "Ce que le ministère de l'Éducation et des Sports entend par programme axé sur les compétences, et ce qu'il attend de vous en classe.",
  'curriculum.loading': 'Ouverture du guide…',
  'curriculum.failed': "Le guide n'a pas pu être ouvert.",
  'curriculum.revised': 'Révisé le {date}',
  'curriculum.notASubstitute':
    "Un résumé, qui ne remplace ni le programme NCDC de votre matière ni la circulaire UNEB en vigueur.",
  'curriculum.basedOn': "D'après :",
  'curriculum.sources': 'Nos sources',
  'curriculum.sourcesNote': "Vérifiez tout ce que vous direz à un parent ou à un inspecteur.",
  'curriculum.officialSources': 'Sources officielles',
  'curriculum.reportingSources': 'Articles de presse',
  'curriculum.otherCountry':
    "Cette école n'utilise pas un barème ougandais : ce guide décrit donc le programme d'un autre pays. Il est ici à titre de lecture, non de consigne.",
  'home.parentRequests': 'Demandes des parents',
  'home.parentRequestsWaiting': { one: '{count} en attente', other: '{count} en attente' },
  'parentQueue.title': 'Demandes des parents',
  'parentQueue.loading': 'Chargement des demandes…',
  'parentQueue.failed': "Les demandes n'ont pas pu être chargées.",
  'parentQueue.empty': "Rien en attente. Les demandes envoyées par les parents s'affichent ici.",
  'parentQueue.note': "Approuver enregistre la réponse de l'école. Cela n'ouvre pas le portail : l'autorisation est toujours délivrée au secrétariat.",
  'parentQueue.forYou': 'Adressée à vous',
  'parentQueue.forOther': 'Adressée au {post}',
  'parentQueue.forAnyone': 'Adressée à personne en particulier',
  'parentQueue.aGuardian': 'Un parent',
  'parentQueue.noteLabel': 'Votre réponse',
  'parentQueue.noteHint': 'À récupérer au secrétariat à 13h45',
  'parentQueue.approve': 'Approuver',
  'parentQueue.decline': 'Refuser',
  'parentQueue.approved': 'Approuvée',
  'parentQueue.approvedBody': "Le parent peut la voir. Délivrez l'autorisation au secrétariat à son arrivée.",
  'parentQueue.declined': 'Refusée',
  'parentQueue.decideFailed': "Cette demande n'a pas pu être traitée",
  'parent.title': 'Votre enfant',
  'parent.pendingTitle': "En attente de validation par l'école",
  'parent.pendingBody':
    'Le secrétariat a reçu votre demande et confirmera que vous êtes bien le parent ou le tuteur '
    + 'de cet enfant. Tout apparaîtra ici dès que ce sera fait.',
  'parent.overview': "En bref",
  'parent.balance': 'Solde',
  'parent.attendance': 'Présence',
  'parent.average': 'Moyenne',
  'parent.position': 'Rang {position} sur {of}',
  'parent.paidOf': '{paid} déjà payés',
  'parent.progressTitle': 'Ses résultats',
  'parent.progressNote':
    "Toutes les notes enregistrées par l'école, la plus récente en dernier. Une matière avec une seule note n'a pas encore de tendance.",
  'parent.progressEmpty': 'Aucune note enregistrée pour le moment.',
  'parent.progressMarks': { one: '{count} note enregistrée', other: '{count} notes enregistrées' },
  'parent.progressAverage': 'Moyenne sur toutes les notes',
  'parent.progressRounds': 'Chaque barre représente une journée de notation',
  'parent.up': 'en hausse de {change}',
  'parent.down': 'en baisse de {change}',
  'parent.steady': 'stable',
  'parent.firstMark': 'première note',
  'parent.subjectMarks': { one: '{count} note', other: '{count} notes' },
  'parent.best': 'meilleure note : {percent} %',
  'parent.gateTitle': 'Arrivées et sorties',
  'parent.gateNote': 'La première arrivée et le dernier départ de chaque jour.',
  'parent.gateEmpty': 'Rien enregistré au portail pour le moment.',
  'parent.arrived': 'entrée à {time}',
  'parent.left': 'sortie à {time}',
  'parent.noArrival': 'aucune arrivée enregistrée',
  'parent.healthTitle': 'Infirmerie',
  'parent.healthEmpty': "Aucun passage à l'infirmerie.",
  'parent.disciplineTitle': 'Comportement',
  'parent.disciplineEmpty': 'Rien à signaler.',
  'parentReq.title': 'Écrire au secrétariat',
  'parentReq.note':
    "Ceci envoie un message au secrétariat. Cela n'ouvre pas le portail\u00A0: quelqu'un de "
    + "l'école doit d'abord donner son accord, et vous verrez sa réponse ici.",
  'parentReq.pickup': 'Venir le chercher plus tôt',
  'parentReq.absence': 'Justifier une absence',
  'parentReq.addressTo': 'Qui doit décider',
  'parentReq.addressToHint': 'Choisissez à qui demander',
  'parentReq.reason': 'Pourquoi',
  'parentReq.pickupHint': 'Rendez-vous chez le dentiste à quatorze heures',
  'parentReq.absenceHint': 'Elle a eu le paludisme et était à la clinique',
  'parentReq.send': 'Envoyer au secrétariat',
  'parentReq.sent': 'Envoyé au secrétariat',
  'parentReq.sentBody':
    "Vous verrez leur réponse ici. Rien ne change au portail tant qu'ils n'ont pas donné leur accord.",
  'parentReq.failed': "Votre demande n'a pas pu être envoyée",
  'parentReq.status.pending': 'En attente',
  'parentReq.status.approved': 'Accordé',
  'parentReq.status.declined': 'Refusé',
  'parentReq.status.cancelled': 'Annulé',


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
  /* ── saisie des notes ───────────────────────────────────────────────────── */
  'marks.progress': '{marked} sur {total} notés',
  'marks.stillToMark': { one: '{count} reste à noter', other: '{count} restent à noter' },
  'marks.allMarked': 'toute la classe est notée',
  'marks.outOf': 'sur {max}',
  'marks.title': 'Saisir des notes',
  'marks.loadingClasses': 'Chargement de vos classes…',
  'marks.noClasses':
    "Aucune classe ne vous est encore attribuée. Un administrateur vous en attribue une dans "
    + "l'application web, sous Utilisateurs — ouvrez votre nom et choisissez Classes — et elle "
    + 'apparaîtra ici.',
  'marks.classAndSubject': 'Classe et matière',
  'marks.chooseClass': 'Choisissez une classe…',
  'marks.classOption': '{class} ({subject})',
  'marks.loadingClass': 'Chargement de la classe…',

  'marks.modeType': 'Saisir',
  'marks.modePhoto': 'Photographier',
  'marks.modeFile': 'Fichier',

  'marks.photoHint':
    "Photographiez une feuille de notes et les notes en sont extraites. Vous les vérifiez avant "
    + "tout enregistrement.",
  'marks.openCamera': "Ouvrir l'appareil photo",
  'marks.openSettings': 'Ouvrir les réglages',
  'marks.allowCamera': "Autoriser l'appareil photo",
  'marks.photographTitle': 'Photographier la feuille',
  'marks.framingHint':
    'Cadrez toute la feuille. Les noms à gauche, les notes à droite.',
  'marks.takePicture': 'Prendre la photo',
  'marks.cameraFailed': "L'appareil photo n'a pas pu prendre cette photo.",

  'marks.fileHint':
    'Un tableur, un fichier Word ou un PDF. Les noms dans une colonne, les notes dans une autre.',
  'marks.chooseFile': 'Choisir un fichier',
  'marks.reading': 'Lecture de la feuille…',
  'marks.fileUnreadable': "Ce fichier n'a pas pu être lu.",
  'marks.notRead': 'Non lu',
  'marks.fileUnopenable': "Ce fichier n'a pas pu être ouvert.",

  'marks.needsChecking': {
    one: '{count} ligne à vérifier. Rien n\'est encore enregistré.',
    other: '{count} lignes à vérifier. Rien n\'est encore enregistré.',
  },
  'marks.checkThese': "Vérifiez ces lignes, puis enregistrez. Rien n'est encore enregistré.",
  'marks.unnamed': 'Sans nom',
  'marks.readAs': 'Lu comme « {name} » — {match}',
  'marks.notOnTheSheet': 'Absent de la feuille',

  'marks.nothingToSave': "Il n'y a encore aucune note à enregistrer.",
  'marks.saving': 'Enregistrement…',
  'marks.save': { one: 'Enregistrer {count} note', other: 'Enregistrer {count} notes' },
  'marks.unconfirmed': "Le serveur n'a pas confirmé les notes. Rien n'a été enregistré.",
  'marks.saved': 'Notes enregistrées',
  'marks.savedCount': {
    one: '{count} enregistrée en {subject}',
    other: '{count} enregistrées en {subject}',
  },
  'marks.notSaved': 'Non enregistré',
  'marks.saveFailed': "Ces notes n'ont pas été enregistrées.",

  'marks.building': 'Construction…',
  'marks.printClass': 'Imprimer cette classe',
  'marks.notPrinted': 'Non imprimé',
  'marks.printFailed': "Ce tableau n'a pas pu être imprimé.",

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
  'printClass.documentMarks': 'Tableau de notes',
  'printClass.documentMarksHint':
    'Une ligne par élève, une colonne par matière — une page par classe',
  'printClass.howMuch': 'Quelle étendue',
  'printClass.thisStream': 'Cette série uniquement',
  'printClass.thisStreamHint': 'Un seul tableau, pour la classe choisie',
  'printClass.everyStream': 'Toutes les séries de ce niveau',
  'printClass.everyStreamHint': 'Un tableau par série, chacun sur sa propre page',
  'printClass.whichExam': 'Quelles notes',
  'printClass.examsLoading': 'Recherche des notes saisies…',
  'printClass.noMarks': "Aucune note n'a encore été saisie pour cette classe.",
  'printClass.examEntries': { one: '{count} note saisie', other: '{count} notes saisies' },
  'printClass.chooseExam': 'Choisissez les notes à imprimer.',
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

  /* ── les actions de l'accueil ─────────────────────────────── */
  'home.overview': "Aperçu de l'école",
  'home.students': 'Élèves',
  'home.attendanceToday': "Présence aujourd'hui",
  'home.feesOwing': 'Frais impayés',
  'home.passRate': 'Taux de réussite',
  'home.dormitories': 'Dortoirs',
  'home.callRegister': "Faire l'appel",
  'home.curriculumGuide': 'Guide du programme',
  'home.recordMarks': 'Saisir les notes',
  'home.registerStudent': 'Inscrire un élève',
  'home.recentStudents': 'Élèves récents',

  'sync.waiting': {
    one: "{count} élément en attente d'envoi",
    other: "{count} éléments en attente d'envoi",
  },
  'sync.explain': "Enregistré sur ce téléphone. L'envoi se fera au retour du réseau.",
  'sync.retry': 'Essayer maintenant',
  'sync.queued': 'Enregistré sur ce téléphone',
  'sync.queuedDetail': "Pas de réseau pour le moment. L'envoi se fera au retour du signal.",

  /* ------------------------------------------------------------------------ the date picker -- */
  'date.choose': 'Choisir une date',
  'date.month': 'Mois',
  'date.year': 'Année',
  "date.today": "Aujourd'hui",
  'date.clear': 'Effacer',

  /* ------------------------------------------------------------------------ signing in ----- */
  'auth.sessionEnded': 'Votre session a expiré. Veuillez vous reconnecter.',
  'gate.title': 'Le portail',
  'gate.onSite': 'Sur le site',
  'gate.checkedIn': 'Entrés',
  'gate.checkedOut': 'Sortis',
  'gate.movements': 'Passages',
  'gate.noMovements': 'Personne n’a encore franchi le portail aujourd’hui.',
  'gate.cameIn': 'entré',
  'gate.wentOut': 'sorti',
  'gate.turnedBackOne': 'refoulé',
  'gate.turnedBackCount': { one: '{count} élève a été refoulé aujourd’hui.', other: '{count} élèves ont été refoulés aujourd’hui.' },
  'gate.today': 'Aujourd’hui au portail',
  'gate.openBoard': 'Ouvrir le tableau du portail',
  'gate.loading': 'Lecture du portail…',
  'gate.loadFailed': 'Impossible de lire le portail.',
  'home.gate': 'Le portail',
};

export default fr;
