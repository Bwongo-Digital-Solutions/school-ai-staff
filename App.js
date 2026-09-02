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
import { ThemeProvider, useTheme } from './theme';
import { BrandingProvider, useBranding } from './branding';
import { api, schoolApi, ApiError } from './api';
import { allowedTabs, hasRoster, isAskari } from './roles';
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
import PendingGateScreen from './screens/PendingGateScreen';
import RegisterStudentScreen from './screens/RegisterStudentScreen';
import MatronScreen from './screens/MatronScreen';
import MarksScreen from './screens/MarksScreen';
import ProfileScreen from './screens/ProfileScreen';
import GateConfirmScreen from './screens/GateConfirmScreen';
import RollCallScreen from './screens/RollCallScreen';
import MessagesScreen from './screens/MessagesScreen';
import ComposeScreen from './screens/ComposeScreen';
import AssistantScreen from './screens/AssistantScreen';

const STORAGE = {
  user: 'kps.user',
  recent: 'kps.recent',
};

const RECENT_LIMIT = 6;

/* There is no push channel, so the inbox is polled while the app is in front of someone.
   A minute is often enough for a message to feel prompt without loading the school's
   server with a request per staff phone per few seconds. */
const INBOX_POLL_MS = 60000;

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
      <ToastProvider>
        <BrandingProvider>
          <Root />
          {/* Above every screen, so an action can report itself from wherever it ran. */}
          <AlertHost />
        </BrandingProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

function Root() {
  const { colors, theme } = useTheme();
  const { refresh: refreshBranding } = useBranding();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [booted, setBooted] = useState(false);
  const [user, setUser] = useState(null);
  const [apiBase, setApiBase] = useState('');
  const [recent, setRecent] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [tab, setTab] = useState('home');
  const [stack, setStack] = useState([]);
  /* The hardware back handler needs the depth synchronously, before React has
     applied the queued state, so the stack is mirrored in a ref. */
  const stackRef = useRef([]);

  const [school, setSchool] = useState({ students: [], fees: [] });
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
      if (storedUser && base) setUser(storedUser);
      setBooted(true);
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
      const target = allowedTabs(user).includes(next) ? next : 'home';
      stackRef.current = [];
      setStack([]);
      setTab(target);
    },
    [user],
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

  const handleSignedIn = useCallback((nextUser) => {
    AsyncStorage.setItem(STORAGE.user, JSON.stringify(nextUser)).catch(() => {});
    refreshBranding();
    loadedRef.current = false;
    stackRef.current = [];
    setStack([]);
    setTab('home');
    setInbox(EMPTY_INBOX);
    setPendingGate(EMPTY_PENDING_GATE);
    setChat(EMPTY_CHAT);
    setUser(nextUser);
  }, [refreshBranding]);

  const handleSignOut = useCallback(() => {
    AsyncStorage.removeItem(STORAGE.user).catch(() => {});
    // The session goes with the account; otherwise the next person to sign in inherits it.
    api.setToken('').catch(() => {});
    loadedRef.current = false;
    stackRef.current = [];
    setStack([]);
    setTab('home');
    setSchool({ students: [], fees: [] });
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
      }, INBOX_POLL_MS);
    };
    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    /* 'unknown' is what some devices report before the first change event; only a
       genuinely backgrounded app should sit idle. */
    if (AppState.currentState !== 'background') start();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshInbox();
        refreshPendingGate();
        start();
      } else {
        stop();
      }
    });

    return () => {
      stop();
      sub.remove();
    };
  }, [user, refreshInbox, refreshPendingGate]);

  useNewMessageChime(inbox);

  if (!fontsLoaded || !booted) {
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

  return (
    <View style={styles.root}>
      {statusBar}
      <View style={styles.flex}>
        {route.name === 'home' && (
          <HomeScreen
            user={user}
            students={school.students}
            fees={school.fees}
            recent={recent}
            loading={pending}
            error={error}
            unread={inbox.unread}
            pendingGateCount={pendingGate.count}
            pendingGateLoaded={pendingGate.loaded}
            onOpenPendingGate={() => push({ name: 'pendinggate' })}
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
          />
        )}

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

      {atRoot ? <TabBar active={tab} user={user} onSelect={goToTab} /> : null}

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
    },
    flex: {
      flex: 1,
    },
  });
