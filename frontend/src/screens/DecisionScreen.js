import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Linking, ActivityIndicator } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import FlippableRestaurantCard from '../components/FlippableRestaurantCard';
import { useTheme } from '../context/ThemeContext';
import { shareText } from '../services/share';

export default function DecisionScreen({ navigation }) {
  const { code, deviceId, isHost, snapshot, dismissActiveSession } = useSession();
  const { colors: COLORS, commonStyles } = useTheme();
  const styles = getStyles(COLORS);
  const decided = snapshot?.decided;
  const [runningItBack, setRunningItBack] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (snapshot && snapshot.state !== 'decided') {
      navigation.replace('WaitingRoom');
    }
  }, [snapshot?.state, navigation]);

  function handleDirections() {
    if (!decided) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${decided.lat},${decided.lng}&destination_place_id=${decided.placeId}`;
    Linking.openURL(url);
  }

  async function handleShare() {
    if (!decided) return;
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(decided.name)}&query_place_id=${decided.placeId}`;
    await shareText(`Let's eat at ${decided.name}! ${mapsLink}`);
  }

  async function handleGoAgain() {
    setRunningItBack(true);
    setError(null);
    try {
      await api.runItBack(code, deviceId);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunningItBack(false);
    }
  }

  async function handleEndSession() {
    setEnding(true);
    await dismissActiveSession();
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }));
  }

  if (!decided) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Eat Here!</Text>
        <FlippableRestaurantCard restaurant={decided} />

        <TouchableOpacity style={commonStyles.filledButton} onPress={handleDirections}>
          <Text style={commonStyles.filledButtonText}>Where ah?</Text>
        </TouchableOpacity>

        {isHost && (
          <TouchableOpacity style={commonStyles.filledButton} onPress={handleGoAgain} disabled={runningItBack}>
            {runningItBack ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={commonStyles.filledButtonText}>Go again</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={commonStyles.filledButton} onPress={handleShare}>
          <Text style={commonStyles.filledButtonText}>Share</Text>
        </TouchableOpacity>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={commonStyles.outlineButton} onPress={handleEndSession} disabled={ending}>
          {ending ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <Text style={commonStyles.outlineButtonText}>Pang kang</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(COLORS) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    // flexGrow (not flex) on a ScrollView's contentContainerStyle: centers content when
    // it's shorter than the screen, but lets it scroll instead of clipping both ends
    // (e.g. the title or the last button) when it's taller.
    content: { flexGrow: 1, padding: 20, gap: 8, justifyContent: 'center' },
    title: { fontSize: 34, fontWeight: '900', color: COLORS.text, textAlign: 'center', marginBottom: 4 },
    error: { color: '#d33', fontSize: 14, textAlign: 'center', marginTop: 4 },
  });
}
