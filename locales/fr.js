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
};

export default fr;
