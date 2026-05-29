import * as Sentry from '@sentry/react-native';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, AppState, type AppStateStatus } from 'react-native';

import './src/i18n';
import StorybookUIRoot from './.storybook';
import OfflineIndicator from './src/components/OfflineIndicator';
import { useSplashGuard } from './src/components/SplashGuard';
import UpdatePrompt from './src/components/UpdatePrompt';
import { PetProvider } from './src/context/PetContext';
import AppNavigator from './src/navigation/AppNavigator';
import LockScreen from './src/screens/LockScreen';
import {
  enableScreenCapturePrevention,
  loadLockTimeout,
  getLockTimeoutMs,
} from './src/services/appLockService';
import crashReporting from './src/services/crashReporting';
import ErrorBoundary from './src/components/ErrorBoundary';
import {
  registerNotificationActions,
  watchNotificationActions,
} from './src/services/notificationService';
import updateService from './src/services/updateService';
import { registerBackgroundMedicationTask } from './src/services/backgroundTaskService';
import { checkAppVersion } from './src/services/versionCheckService';

const isStorybookEnabled = process.env.STORYBOOK_ENABLED === 'true';

// Initialise Sentry before the first render
crashReporting.init();

function App() {
  const { appReady } = useSplashGuard();
  const [updateStatus, setUpdateStatus] = React.useState<
    { visible: false } | { visible: true; variant: 'optional' | 'force'; storeUrl?: string }
  >({ visible: false });
  const [locked, setLocked] = useState(false);
  const [pinFallback, setPinFallback] = useState(false);
  const backgroundedAt = React.useRef<number | null>(null);

  // Enable screen capture prevention on mount
  useEffect(() => {
    void enableScreenCapturePrevention();
  }, []);

  // Lock app after idle timeout when returning to foreground
  useEffect(() => {
    const onChange = async (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        backgroundedAt.current = Date.now();
      } else if (state === 'active' && backgroundedAt.current !== null) {
        const elapsed = Date.now() - backgroundedAt.current;
        backgroundedAt.current = null;
        const timeout = await loadLockTimeout();
        const ms = getLockTimeoutMs(timeout);
        if (ms > 0 && elapsed >= ms) {
          setPinFallback(false);
          setLocked(true);
        }
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  // Check for updates on launch
  React.useEffect(() => {
    if (!appReady) return;
    void (async () => {
      // 1. Check server-side minimum version (critical/recommended)
      const versionResult = await checkAppVersion();
      if (versionResult.type === 'critical') {
        setUpdateStatus({ visible: true, variant: 'force', storeUrl: versionResult.storeUrl });
        return; // no need to check OTA if a store update is required
      }
      if (versionResult.type === 'recommended') {
        setUpdateStatus({ visible: true, variant: 'optional', storeUrl: versionResult.storeUrl });
        return;
      }

      // 2. Fall back to OTA check via expo-updates
      const result = await updateService.checkForUpdate();
      if (result.type === 'force-update') {
        setUpdateStatus({ visible: true, variant: 'force', storeUrl: result.storeUrl });
      } else if (result.type === 'ota-available') {
        setUpdateStatus({ visible: true, variant: 'optional' });
      }
    })();
  }, [appReady]);

  const handleUpdate = () => {
    void updateService.applyOtaUpdate();
  };

  const handleDismiss = () => {
    setUpdateStatus({ visible: false });
  };

  useEffect(() => {
    void registerNotificationActions();
    const subscription = watchNotificationActions();
    void registerBackgroundMedicationTask();
    return () => subscription.remove();
  }, []);

  if (!appReady) return <View style={styles.root} />;

  if (locked) {
    return <LockScreen showPinFallback={pinFallback} onUnlock={() => setLocked(false)} />;
  }

  return (
    <PetProvider>
      <ErrorBoundary>
        <View style={styles.root}>
          <OfflineIndicator />
          <AppNavigator />
          <UpdatePrompt
            visible={updateStatus.visible}
            variant={updateStatus.visible ? updateStatus.variant : 'optional'}
            storeUrl={updateStatus.visible ? updateStatus.storeUrl : undefined}
            onUpdate={handleUpdate}
            onDismiss={handleDismiss}
          />
        </View>
      </ErrorBoundary>
    </PetProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

const AppRoot = isStorybookEnabled ? StorybookUIRoot : Sentry.wrap(App);

export default AppRoot;
