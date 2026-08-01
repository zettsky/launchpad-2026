import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Linking, ActivityIndicator } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import FlippableRestaurantCard from '../components/FlippableRestaurantCard';
import { shareText } from '../services/share';

function formatDistance(distanceM) {
  if (distanceM == null) return '';
  return distanceM < 1000 ? `${Math.round(distanceM)}m away` : `${(distanceM / 1000).toFixed(1)}km away`;
}

export default function DecisionScreen({ navigation }) {
  const { code, deviceId, isHost, snapshot, resetSession } = useSession();
  const decided = snapshot?.decided;
  const [runningItBack, setRunningItBack] = useState(false);
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

  function handleShare() {
    if (!decided) return;
    shareText(`🍜 You're eating at ${decided.name}, ${formatDistance(decided.distanceM)} from the meeting point!`);
  }

  async function handleRunItBack() {
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

  function handleDone() {
    resetSession();
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
      <View style={styles.content}>
        <Text style={styles.title}>It's decided! 🎉</Text>
        <FlippableRestaurantCard restaurant={decided} />

        <TouchableOpacity style={styles.primaryButton} onPress={handleDirections}>
          <Text style={styles.primaryButtonText}>Get directions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleShare}>
          <Text style={styles.secondaryButtonText}>Share with the group</Text>
        </TouchableOpacity>

        {isHost && (
          <>
            {error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity style={styles.runItBackButton} onPress={handleRunItBack} disabled={runningItBack}>
              {runningItBack ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.runItBackText}>Run it back 🔁</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  primaryButton: { backgroundColor: '#ff5a5f', paddingVertical: 16, borderRadius: 999, marginTop: 16 },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  secondaryButton: { paddingVertical: 14, borderRadius: 999, marginTop: 8, borderWidth: 1, borderColor: '#ddd' },
  secondaryButtonText: { color: '#333', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  runItBackButton: { backgroundColor: '#222', paddingVertical: 14, borderRadius: 999, marginTop: 8 },
  runItBackText: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  error: { color: '#d33', fontSize: 14, textAlign: 'center', marginTop: 8 },
  doneButton: { paddingVertical: 14, marginTop: 4 },
  doneButtonText: { color: '#888', fontSize: 15, textAlign: 'center' },
});