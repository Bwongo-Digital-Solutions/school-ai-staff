import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { colors } from './theme';
import { initialRecentStudents } from './data/mock';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import ScannerScreen from './screens/ScannerScreen';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [screen, setScreen] = useState('login');
  const [activeTab, setActiveTab] = useState('home');
  const [recentStudents, setRecentStudents] = useState(initialRecentStudents);

  const handleLogin = useCallback(() => {
    setScreen('dashboard');
    setActiveTab('home');
  }, []);

  const handleOpenScanner = useCallback(() => {
    setScreen('scanner');
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setScreen('dashboard');
    setActiveTab('home');
  }, []);

  const handleScanComplete = useCallback(() => {
    setRecentStudents((prev) => {
      const promoted = prev.find((s) => s.id === 'KPS-2024-0512');
      const rest = prev.filter((s) => s.id !== 'KPS-2024-0512');
      return promoted ? [promoted, ...rest] : prev;
    });
    setScreen('dashboard');
    setActiveTab('home');
  }, []);

  const handleSelectTab = useCallback((tab) => {
    if (tab === 'scan') {
      setActiveTab('scan');
      setScreen('scanner');
      return;
    }
    if (tab === 'home') {
      setActiveTab('home');
      return;
    }
    setActiveTab(tab);
  }, []);

  if (!fontsLoaded) {
    return <View style={styles.loading} />;
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {screen === 'login' && <LoginScreen onLogin={handleLogin} />}
      {screen === 'dashboard' && (
        <DashboardScreen
          recentStudents={recentStudents}
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onScanPress={handleOpenScanner}
        />
      )}
      {screen === 'scanner' && (
        <ScannerScreen
          onBack={handleBackToDashboard}
          onScanComplete={handleScanComplete}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
