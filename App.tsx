import React from 'react';
import { View, StyleSheet } from 'react-native';

import './src/i18n';
import OfflineIndicator from './src/components/OfflineIndicator';
import { useSplashGuard } from './src/components/SplashGuard';
import { PetProvider } from './src/context/PetContext';
import AppNavigator from './src/navigation';
import { ThemeProvider } from './src/utils/useTheme';

export default function App() {
  const { appReady } = useSplashGuard();

  if (!appReady) return <View style={styles.root} />;

  return (
    <ThemeProvider>
      <PetProvider>
        <View style={styles.root}>
          <OfflineIndicator />
          <AppNavigator />
        </View>
      </PetProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
