import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, AppState, BackHandler, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { ThemeProvider, screenTopInset, useTheme } from './theme';
import { BrandingProvider, useBranding } from './branding';
import { api, schoolApi, ApiError, flushOutbox } from './api';
import { onPendingChange } from './outbox';
import { allowedTabs, canPrintDocuments, featureOn, hasRoster, isAskari, landingTab } from './roles';
import { useNewMessageChime } from './notify';
import TabBar from './components/TabBar';
import SettingsSheet from './components/SettingsSheet';
import { ToastProvider } from './components/Toast';
import AlertHost from './components/AlertHost';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ScannerScreen from './screens/ScannerScreen';
import StudentsScreen from './screens/StudentsScreen';
import StudentCardScreen from './screens/StudentCardScreen';
import ReportScreen from './screens/ReportScreen';
import PrintClassScreen from './screens/PrintClassScreen';
import ChildScreen from './screens/ChildScreen';
import UpdateBanner from './components/UpdateBanner';
import SyncBanner from './components/SyncBanner';
import { checkForUpdate, dismissUpdate } from './update';
import PendingGateScreen from './screens/PendingGateScreen';
import GateBoardScreen from './screens/GateBoardScreen';
import RegisterStudentScreen from './screens/RegisterStudentScreen';
import MatronScreen from './screens/MatronScreen';
import MarksScreen from './screens/MarksScreen';
import ProfileScreen from './screens/ProfileScreen';
import GateConfirmScreen from './screens/GateConfirmScreen';
import RollCallScreen from './screens/RollCallScreen';
import MessagesScreen from './screens/MessagesScreen';
import ComposeScreen from './screens/ComposeScreen';
import AssistantScreen from './screens/AssistantScreen';
import { LanguageProvider } from './i18n';

const STORAGE = {
  user: 'kps.user',
  recent: 'kps.recent',
};

const RECENT_LIMIT = 6;

/* There is no push channel, so the inbox is polled while the app is in front of someone.
   A minute is often enough for a message to feel prompt without loading the school's
   server with a request per staff phone per few seconds. */
const INBOX_POLL_MS = 60000;

/* The roster, emptied. Named alongside the others because ending a session has to put it back —
   leaving one school's children in memory for whoever signs in next is not a thing to do by
   omission. */
const EMPTY_SCHOOL = { students: [], fees: [] };
const EMPTY_INBOX = { messages: [], unread: 0, loaded: false, error: '' };
const EMPTY_PENDING_GATE = { rows: [], count: 0, loaded: false };
const EMPTY_CHAT = {
  conversationId: null,
  messages: [],
  models: [],
  modelId: null,
  modelsLoaded: false,
  busy: false,
};

export default function App() {
  return (
    <ThemeProvider>
      {/* Outside everything that renders words, including the alert host — a failure reported from
          the gate is one of the first things anybody reads. */}
      <LanguageProvider>
        <ToastProvider>
          <BrandingProvider>
            <Root />
            {/* Above every screen, so an action can report itself from wherever it ran. */}
            <AlertHost />
          </BrandingProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

function Root() {
  const { colors, theme } = useTheme();
  const { refresh: refreshBranding } = useBranding();
  const styles = useMemo(() => createStyles(colors), [colors]);

  /* The second element is the error, and discarding it is how this app came to show nothing at
     all. `useFonts` leaves `loaded` false for ever when loading fails, so the gate below — which
     waits for `fontsLoaded` — held the whole app on an empty themed View: no message, no sign-in,
     no way out but reinstalling. A font that will not load is worth losing; the app is not. */
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  /* Ready means loaded *or* known to have failed. Android falls back to the system face for a
     family it does not have, so a teacher gets the app in a slightly different typeface rather
     than a blank screen. */
  const fontsSettled = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    // Recorded once, because the only other evidence of this is a typeface nobody may notice.
    if (fontError) console.warn('The bundled fonts did not load; using the system face.', fontError);
  }, [fontError]);

  const [booted, setBooted] = useState(false);
  const [user, setUser] = useState(null);
  /* Why the login screen is being shown, when there is a reason worth saying. A session that ran
     out is not the same as never having signed in, and a teacher who is suddenly asked for a
     password deserves to know which. Held as a flag rather than as a sentence so that switching
     language re-renders it translated instead of leaving yesterday's wording on screen. */
  const [sessionEnded, setSessionEnded] = useState(false);
  const [apiBase, setApiBase] = useState('');
  const [recent, setRecent] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  /* A newer build, when there is one. Null covers every uninteresting case — up to date, nothing
     published, a server that cannot be reached — so there is one thing to render on. */
  const [update, setUpdate] = useState(null);
  /* What this school has, and what it has switched off. Null until the server has answered, which
     every reader treats as "everything on" — see `featureOn` in roles.js for why that direction. */
  const [features, setFeatures] = useState(null);
  /* Asked at most every few hours. The server caches its own answer for an hour and a release
     happens a few times a term, so foregrounding the app twenty times in a morning is one
     request. */
  const updateCheckedAt = useRef(0);

  const [tab, setTab] = useState('home');
  const [stack, setStack] = useState([]);
  /* The hardware back handler needs the depth synchronously, before React has
     applied the queued state, so the stack is mirrored in a ref. */
  const stackRef = useRef([]);

  /* Six hours, not every foregrounding: the server caches its own answer for an hour and a release
     happens a few times a term, so a teacher opening the app twenty times in a morning costs one
     request. `checkForUpdate` answers null for everything uninteresting, so this either has
     something worth saying or it has nothing. */
  const UPDATE_CHECK_FLOOR_MS = 6 * 60 * 60 * 1000;

  /* How much work is waiting to reach the server, kept live by the outbox itself rather than
     polled — enqueuing happens inside the api layer, where this component cannot see it. */
  const [pendingWrites, setPendingWrites] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => onPendingChange(setPendingWrites), []);

  /**
   * Send whatever is waiting.
   *
   * Guarded against overlapping runs: the foreground event and the timer can land together, and two
   * flushes at once would race to send the same entry twice. The server would dedupe it — every
   * queued entry carries its key — but a request that need not be made is better not made on a
   * phone paying for its own data.
   */
  const syncingRef = useRef(false);
  const drainOutbox = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      await flushOutbox();
    } catch {
      /* flush() reports rather than throws; anything reaching here is unexpected and must not take
         the app down for work that is still safely on the queue. */
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);

  const lookForUpdate = useCallback(async () => {
    if (Date.now() - updateCheckedAt.current < UPDATE_CHECK_FLOOR_MS) return;
    updateCheckedAt.current = Date.now();
    setUpdate(await checkForUpdate());
  }, []);

  /* Which features this school is using. Read alongside the update check rather than on its own
     schedule: both are "what has changed about this school since I last looked", both are cheap, and
     an administrator switching something off is no more urgent to a phone than a new release.

     A failure leaves the previous answer standing, and the first failure leaves it null — which means
     everything on. The server refuses what is off regardless, so the cost of being wrong here is one
     clear refusal rather than an app with no tabs. */
  const lookForFeatures = useCallback(async () => {
    try {
      const answer = await schoolApi.entitlements();
      if (answer && answer.features) setFeatures(answer.features);
    } catch {
      // Offline, or a server mid-restart. The teacher did not ask, so there is nothing to report.
    }
  }, []);

  /**
   * The school's own figures, for the band at the top of Home.
   *
   * Null until the server answers, and null again if it refuses — the band simply is not drawn. That
   * is deliberate and not laziness: these totals are the school's roll, its money and its register,
   * and the honest thing to show when they cannot be fetched is nothing. A stale or locally guessed
   * figure looks exactly like a real one.
   *
   * Nothing else on Home depends on it. The scan button, the actions and the recent students are all
   * still there on a phone that cannot reach this endpoint.
   */
  const [overview, setOverview] = useState(null);

  const lookForOverview = useCallback(async () => {
    try {
      setOverview(await schoolApi.dashboard());
    } catch {
      // Same as above: the teacher did not ask for this, so a failure is not worth a message.
    }
  }, []);

  const [school, setSchool] = useState(EMPTY_SCHOOL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loadedRef = useRef(false);

  const [inbox, setInbox] = useState(EMPTY_INBOX);
  const [pendingGate, setPendingGate] = useState(EMPTY_PENDING_GATE);
  const [chat, setChat] = useState(EMPTY_CHAT);

  /* The gate keeper's chosen action and the card they just scanned. Nothing is written
     until the confirmation screen is accepted, so this is the whole of the pending act. */
  const [gateAction, setGateAction] = useState(null);
  const [gateCard, setGateCard] = useState(null);

  /* The register survives a trip through the scanner, so the chosen class and the pinned
     student live above the screen that shows them. */
  const [rollClass, setRollClass] = useState(null);
  const [rollPinned, setRollPinned] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const base = await api.load();

      let storedUser = null;
      let storedRecent = [];
      try {
        const raw = await AsyncStorage.getItem(STORAGE.user);
        if (raw) storedUser = JSON.parse(raw);
      } catch {
        storedUser = null;
      }
      try {
        const raw = await AsyncStorage.getItem(STORAGE.recent);
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed)) storedRecent = parsed;
      } catch {
        storedRecent = [];
      }

      if (cancelled) return;
      setApiBase(base);
      setRecent(storedRecent);

      /* A stored user without a stored token is not a signed-in person.
       *
       * Two ways to arrive here. A phone updating from a build older than 2292ddf has a user in
       * storage and no token at all — that release is where the token began being kept, because
       * before it the app relied on a cookie React Native's fetch never stored. And `setToken('')`
       * can have cleared the token on a 401 while the user object stayed behind.
       *
       * Either way, restoring the user would draw a signed-in app around a credential that does
       * not exist: every read refused, an empty roster, and no way out that anybody would guess
       * except signing out and back in. Better to ask for the sign-in that is actually needed. */
      /* Restoring a session must never be able to stop the app booting.
       *
       * `setBooted(true)` is the only thing standing between this app and a permanently blank
       * screen: the render gate waits on it, and nothing retries. Anything thrown between here and
       * there — a stored user of an unexpected shape, a helper that assumed a field — used to mean
       * an app that never started and gave no reason. Signing in again is a recoverable state; a
       * dead window is not, so the restore is allowed to fail and boot is not. */
      try {
        if (storedUser && base && !api.token()) {
          AsyncStorage.removeItem(STORAGE.user).catch(() => {});
          setSessionEnded(true);
        } else if (storedUser && base) {
          // Reopening the app, not signing in. The same reason as at sign-in: a guardian has no
          // home tab, so starting on one shows them the staff screen until an effect notices.
          setTab(landingTab(storedUser));
          setUser(storedUser);
        }
      } catch (error) {
        console.warn('The stored session could not be restored; asking for a sign-in.', error);
        AsyncStorage.removeItem(STORAGE.user).catch(() => {});
        setSessionEnded(true);
      } finally {
        setBooted(true);
      }

      if (base) refreshBranding();
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshBranding]);

  const loadSchool = useCallback(async ({ force = false } = {}) => {
    if (loadedRef.current && !force) return;
    setLoading(true);
    setError('');
    try {
      const [students, fees] = await Promise.all([
        schoolApi.listStudents(),
        schoolApi.feeStatus().catch(() => []),
      ]);
      setSchool({
        students: Array.isArray(students) ? students : [],
        fees: Array.isArray(fees) ? fees : [],
      });
      loadedRef.current = true;
    } catch (err) {
      loadedRef.current = false;
      setError(err instanceof ApiError ? err.message : 'Could not load school data.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !hasRoster(user)) return;
    loadSchool().catch(() => {});
  }, [user, loadSchool]);

  /* Refreshed whenever Home is entered, which is the app's natural heartbeat — there is
     no push channel, so a message arrives on the next visit to Home. */
  const refreshInbox = useCallback(
    async ({ quiet = true } = {}) => {
      if (!user || !api.configured()) return;
      try {
        const res = await schoolApi.inbox({ actorEmail: user.auth_email });
        setInbox({
          messages: res.messages || [],
          unread: res.unread || 0,
          loaded: true,
          error: '',
        });
      } catch (err) {
        if (!quiet) setInbox((prev) => ({ ...prev, error: err.message }));
      }
    },
    [user],
  );

  /* The gate's own count, kept beside the inbox because the gate keeper's badge answers a
     different question: how many students are still waiting to be let out. Unread messages
     cannot stand in for it — reading the alert would clear the badge while the student is
     still at the gate, and an unrelated staff message would inflate it. */
  const refreshPendingGate = useCallback(async () => {
    if (!user || !isAskari(user) || !api.configured()) return;
    try {
      const rows = await schoolApi.pendingGatePasses();
      setPendingGate({ rows, count: rows.length, loaded: true });
    } catch {
      /* Left as it was: a failed poll should not blank a count the gate is working from.
         PendingGateScreen is where the reason gets explained. */
    }
  }, [user]);

  const goToTab = useCallback(
    (next) => {
      const target = allowedTabs(user, features).includes(next) ? next : landingTab(user, features);
      stackRef.current = [];
      setStack([]);
      setTab(target);
    },
    [user, features],
  );

  const push = useCallback((route) => {
    stackRef.current = [...stackRef.current, route];
    setStack(stackRef.current);
  }, []);

  const pop = useCallback(() => {
    if (!stackRef.current.length) return false;
    stackRef.current = stackRef.current.slice(0, -1);
    setStack(stackRef.current);
    return true;
  }, []);

  useEffect(() => {
    const onBack = () => {
      if (settingsOpen) {
        setSettingsOpen(false);
        return true;
      }
      return pop();
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [pop, settingsOpen]);

  const pushRecent = useCallback((student) => {
    setRecent((prev) => {
      const next = [student.id, ...prev.filter((id) => id !== student.id)].slice(0, RECENT_LIMIT);
      AsyncStorage.setItem(STORAGE.recent, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const openStudentCode = useCallback(
    (code) => {
      push({ name: 'detail', code });
    },
    [push],
  );

  const openStudent = useCallback(
    (student) => {
      pushRecent(student);
      openStudentCode(student.student_id);
    },
    [pushRecent, openStudentCode],
  );

  const clearGateAction = useCallback(() => {
    setGateAction(null);
    setGateCard(null);
  }, []);

  const startGateAction = useCallback(
    (key) => {
      setGateAction(key);
      setGateCard(null);
      push({ name: 'scan', intent: 'gate' });
    },
    [push],
  );

  const finishGateAction = useCallback(() => {
    clearGateAction();
    goToTab('home');
  }, [clearGateAction, goToTab]);

  const handleGateScanned = useCallback(
    (card) => {
      setGateCard(card);
      push({ name: 'gateconfirm' });
    },
    [push],
  );

  const handleRollCallScanned = useCallback((card) => {
    setRollPinned({
      id: card.student.id,
      student_id: card.student.student_id,
      full_name: card.student.full_name,
      status: (card.roll_call && card.roll_call.marked && card.roll_call.marked.status) || null,
    });
    stackRef.current = [{ name: 'rollcall' }];
    setStack(stackRef.current);
    setTab('home');
  }, []);

  /**
   * Put the app back to nobody-signed-in.
   *
   * Everything a session owns, in one place, because there are two ways out of one and they must
   * leave exactly the same state behind: signing out by hand, and the server refusing the token.
   * The roster in particular — leaving one school's children in memory for whoever signs in next
   * is not a thing to do by omission.
   *
   * Does not touch the token or stored user: the two callers differ on those and say so.
   */
  const clearSession = useCallback(() => {
    loadedRef.current = false;
    stackRef.current = [];
    setStack([]);
    setTab('home');
    setSchool(EMPTY_SCHOOL);
    setOverview(null);
    setError('');
    setInbox(EMPTY_INBOX);
    setPendingGate(EMPTY_PENDING_GATE);
    setChat(EMPTY_CHAT);
    setGateAction(null);
    setGateCard(null);
    setRollClass(null);
    setRollPinned(null);
    setUser(null);
  }, []);

  /**
   * The server has refused the session this phone was carrying.
   *
   * Sessions last SESSION_TTL_HOURS — twelve by default — so for anybody who uses the app two days
   * running this is a daily event, not an edge case. What happened before was that every read came
   * back refused and the app went on drawing a signed-in shell around an empty roster and a Retry
   * button that could only fail again. The only escape was to sign out and back in, which is a
   * thing to have discovered rather than a thing to be told.
   *
   * api.js has already dropped the token by the time this runs, so this clears the rest and says
   * why on the login screen.
   */
  useEffect(() => {
    api.setUnauthorizedHandler(() => {
      AsyncStorage.removeItem(STORAGE.user).catch(() => {});
      clearSession();
      setSessionEnded(true);
    });
    return () => api.setUnauthorizedHandler(null);
  }, [clearSession]);

  const handleSignedIn = useCallback((nextUser) => {
    AsyncStorage.setItem(STORAGE.user, JSON.stringify(nextUser)).catch(() => {});
    setSessionEnded(false);
    refreshBranding();
    loadedRef.current = false;
    stackRef.current = [];
    setStack([]);
    /* The tab this account actually has, not 'home'. The guard effect below would correct a
       guardian a moment later, but "a moment later" is a visible frame of the staff home screen —
       and the entitlements it waits on have not arrived yet at this point, so the correction can
       be more than a frame on a slow connection. */
    setTab(landingTab(nextUser, features));
    setInbox(EMPTY_INBOX);
    setPendingGate(EMPTY_PENDING_GATE);
    setChat(EMPTY_CHAT);
    setUser(nextUser);
  }, [refreshBranding, features]);

  const handleSignOut = useCallback(() => {
    AsyncStorage.removeItem(STORAGE.user).catch(() => {});
    // The session goes with the account; otherwise the next person to sign in inherits it.
    api.setToken('').catch(() => {});
    // Chosen, not imposed — so the login screen has nothing to explain.
    setSessionEnded(false);
    clearSession();
  }, [clearSession]);

  const handleSettingsSaved = useCallback(
    (base) => {
      setApiBase(base);
      loadedRef.current = false;
      refreshBranding();
      // Leaves the "Connected · N students" result on screen briefly before closing.
      setTimeout(() => {
        setSettingsOpen(false);
        if (user && hasRoster(user)) loadSchool({ force: true }).catch(() => {});
      }, 700);
    },
    [user, loadSchool, refreshBranding],
  );

  const retry = useCallback(() => {
    loadSchool({ force: true }).catch(() => {});
  }, [loadSchool]);

  const statusBar = <StatusBar style={theme === 'light' ? 'dark' : 'light'} />;

  const route = stack.length ? stack[stack.length - 1] : { name: tab };
  const atRoot = stack.length === 0;
  const atHome = atRoot && tab === 'home';

  useEffect(() => {
    if (user && atHome) refreshInbox();
  }, [user, atHome, refreshInbox]);

  /* Somebody left on a tab that has just been switched off.
   *
   * The tab bar stops offering it, but that alone leaves whoever was already standing on it looking
   * at the screen — a teacher with the assistant open when an administrator switches it off keeps it
   * until they happen to tap elsewhere. The server refuses every request behind it by then, so what
   * they are looking at is a screen that has stopped working without saying so. This moves them home
   * instead. Runs when the switches change rather than on every render, so it never fights a tap.
   */
  useEffect(() => {
    if (!user) return;
    if (!allowedTabs(user, features).includes(tab)) setTab(landingTab(user, features));
  }, [user, features, tab]);

  /* Also refreshed on every return to the root, so a decision made on the gate list is
     reflected the moment the officer comes back from it. */
  useEffect(() => {
    if (user && atRoot) refreshPendingGate();
  }, [user, atRoot, route.name, refreshPendingGate]);

  /* Keeps the bell honest from any tab. Paused while the app is in the background —
     nobody is looking, and a phone in a pocket should not be making requests. */
  useEffect(() => {
    if (!user) return undefined;

    let timer = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        refreshInbox();
        refreshPendingGate();
        /* The app can be open and still while the signal returns — standing at a gate, screen on,
           nobody touching it. Without this the queue would wait for the next foreground event that
           may not come for hours. */
        void drainOutbox();
      }, INBOX_POLL_MS);
    };
    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    /* 'unknown' is what some devices report before the first change event; only a
       genuinely backgrounded app should sit idle. */
    if (AppState.currentState !== 'background') {
      lookForUpdate();
      lookForFeatures();
      lookForOverview();
      void drainOutbox();
      start();
    }
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshInbox();
        refreshPendingGate();
        lookForUpdate();
        lookForFeatures();
        lookForOverview();
        /* Coming back to the app is the moment most likely to follow walking back into signal, so
           it is the most valuable place to try. */
        void drainOutbox();
        start();
      } else {
        stop();
      }
    });

    return () => {
      stop();
      sub.remove();
    };
  }, [user, refreshInbox, refreshPendingGate, lookForUpdate, lookForFeatures, lookForOverview, drainOutbox]);

  useNewMessageChime(inbox);

  if (!fontsSettled || !booted) {
    return (
      <View style={styles.root}>
        {statusBar}
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.root}>
        {statusBar}
        <LoginScreen
          apiBase={apiBase}
          sessionEnded={sessionEnded}
          onSignedIn={handleSignedIn}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <SettingsSheet
          visible={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSaved={handleSettingsSaved}
        />
      </View>
    );
  }

  /* Covers the commit between signing in and the load effect firing, so the
     roster screens never flash an empty state before the first request. */
  const pending = hasRoster(user) && (loading || (!loadedRef.current && !error));

  const syncBanner = (
    <SyncBanner pending={pendingWrites} busy={syncing} onRetry={drainOutbox} />
  );

  const updateBanner = update ? (
    <UpdateBanner
      update={update}
      onDismiss={() => {
        /* Remembered against the version, not as a flag: waving away 1.2.0 must not silence
           1.3.0 as well. */
        void dismissUpdate(update.version);
        setUpdate(null);
      }}
    />
  ) : null;

  return (
    <View style={styles.root}>
      {statusBar}
      {/* Above the screen rather than inside one, so it is seen wherever the teacher happens to
          be — and outside the tab content, so no screen has to know it exists. It sits at the
          root of the stack only: it must not cover a scan in progress or a form half filled in. */}
      {atRoot ? updateBanner : null}
      {/* Unlike the update banner this is shown on every screen, not only at the root. Unsent work
          is the person's own and they should be able to see it is still unsent from wherever they
          are — including the screen they were on when the signal went. */}
      {syncBanner}
      <View style={styles.flex}>
        {route.name === 'home' && (
          <HomeScreen
            user={user}
            features={features}
            overview={overview}
            students={school.students}
            recent={recent}
            loading={pending}
            error={error}
            unread={inbox.unread}
            pendingGateCount={pendingGate.count}
            pendingGateLoaded={pendingGate.loaded}
            onOpenPendingGate={() => push({ name: 'pendinggate' })}
            onOpenGateBoard={() => push({ name: 'gateboard' })}
            onOpenMatron={() => push({ name: 'matron' })}
            onRegisterStudent={() => push({ name: 'register' })}
            onRecordMarks={() => push({ name: 'marks' })}
            onRetry={retry}
            onScanPress={() => goToTab('scan')}
            onOpenStudent={openStudent}
            onOpenMessages={() => push({ name: 'messages' })}
            onOpenRollCall={() => push({ name: 'rollcall' })}
            onStartGateAction={startGateAction}
          />
        )}

        {route.name === 'scan' && (
          <ScannerScreen
            user={user}
            intent={route.intent || 'card'}
            onCardScanned={openStudentCode}
            onGateScanned={handleGateScanned}
            onRollCallScanned={handleRollCallScanned}
            onBack={atRoot ? undefined : pop}
          />
        )}

        {route.name === 'students' && (
          <StudentsScreen
            students={school.students}
            loading={pending}
            error={error}
            onRetry={retry}
            onOpenStudent={openStudent}
            /* A class set is marks and money for thirty families at once, so the button is only
               drawn for the roles the server would let through anyway. */
            onPrintClass={
              canPrintDocuments(user)
                ? () => push({ name: 'printClass' })
                : undefined
            }
          />
        )}

        {route.name === 'printClass' && <PrintClassScreen user={user} onBack={pop} />}

        {/* A guardian's only screen besides Profile. Its own route rather than a variant of the
            roster: a parent has one child in view, not a school. */}
        {route.name === 'child' && <ChildScreen />}

        {route.name === 'assistant' && (
          <AssistantScreen
            user={user}
            chat={chat}
            onChatChange={setChat}
            onOpenStudentCode={openStudentCode}
          />
        )}

        {route.name === 'profile' && (
          <ProfileScreen
            user={user}
            apiBase={apiBase}
            studentCount={school.students.length}
            onOpenSettings={() => setSettingsOpen(true)}
            onRefresh={() => loadSchool({ force: true })}
            onSignOut={handleSignOut}
          />
        )}

        {route.name === 'detail' && (
          <StudentCardScreen
            code={route.code}
            user={user}
            onBack={pop}
            /* The card is carried into the route so the report screen does not fetch the
               student a second time to learn the parent's email. */
            onSendReport={(card) => push({ name: 'report', card })}
          />
        )}

        {route.name === 'pendinggate' && (
          <PendingGateScreen user={user} onBack={pop} />
        )}

        {route.name === 'gateboard' && (
          <GateBoardScreen onBack={pop} />
        )}

        {route.name === 'matron' && (
          <MatronScreen user={user} onBack={pop} />
        )}

        {route.name === 'report' && (
          <ReportScreen card={route.card} user={user} onBack={pop} />
        )}

        {route.name === 'gateconfirm' && (
          <GateConfirmScreen
            action={gateAction}
            card={gateCard}
            user={user}
            onDone={finishGateAction}
            onCancel={finishGateAction}
            onBack={pop}
          />
        )}

        {route.name === 'rollcall' && (
          <RollCallScreen
            user={user}
            selectedClass={rollClass}
            onSelectClass={setRollClass}
            pinned={rollPinned}
            onSetPinned={setRollPinned}
            onScan={() => push({ name: 'scan', intent: 'rollcall' })}
            onBack={pop}
          />
        )}

        {route.name === 'register' && (
          <RegisterStudentScreen
            user={user}
            onRegistered={() => {
              // The roster the rest of the app reads is cached; a new student must appear in it.
              loadedRef.current = false;
              if (hasRoster(user)) loadSchool({ force: true }).catch(() => {});
            }}
            onBack={pop}
          />
        )}

        {route.name === 'marks' && <MarksScreen user={user} onBack={pop} />}

        {route.name === 'messages' && (
          <MessagesScreen
            user={user}
            inbox={inbox}
            onInboxChange={setInbox}
            onReload={() => refreshInbox({ quiet: false })}
            onCompose={() => push({ name: 'compose' })}
            onOpenPendingGate={() => push({ name: 'pendinggate' })}
            onOpenGateBoard={() => push({ name: 'gateboard' })}
            onBack={pop}
          />
        )}

        {route.name === 'compose' && (
          <ComposeScreen
            user={user}
            onSent={() => {
              pop();
              refreshInbox();
            }}
            onBack={pop}
          />
        )}
      </View>

      {atRoot ? <TabBar active={tab} user={user} features={features} onSelect={goToTab} /> : null}

      <SettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={handleSettingsSaved}
      />
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
      /* Held clear of the status bar here rather than on each screen, because the update and
         sync banners are drawn above the screen — an inset applied per-screen would leave those
         two under the clock and put a second gap beneath them. This is the window's root, so it
         is the one place the overlap actually happens. See `screenTopInset` in theme.js. */
      paddingTop: screenTopInset,
    },
    flex: {
      flex: 1,
    },
  });
