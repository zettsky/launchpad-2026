import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { api } from '../services/api';
import { useSession } from '../context/SessionContext';
import { shareText } from '../services/share';

export default function WaitingRoomScreen({ navigation }) {
  const { code, deviceId, isHost, snapshot, hasSubmittedPreferences } = useSession();
  const [mode, setMode] = useState('swipe');
  const [swipeCount, setSwipeCount] = useState(6);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!snapshot) return;
    if (snapshot.state === 'deciding') {
      navigation.replace('Swipe');
    } else if (snapshot.state === 'decided') {
      navigation.replace('Decision');
    }
  }, [snapshot?.state, navigation]);

  async function handleShare() {
    await shareText(`Join my Launchpad session! Code: ${code}`);
  }

  async function handleStartMatching() {
    setStarting(true);
    setError(null);
    try {
      await api.startMatching(code, deviceId, mode, mode === 'swipe' ? swipeCount : undefined);
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  }

  if (!snapshot) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  const meetingPointSet = snapshot.meetingPoint.lat != null || snapshot.meetingPoint.zone != null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.codeLabel}>Session code</Text>
        <Text style={styles.code}>{code}</Text>
        <TouchableOpacity onPress={handleShare}>
          <Text style={styles.shareLink}>Share code</Text>
        </TouchableOpacity>

        <Text style={styles.memberCount}>{snapshot.memberCount} in the group</Text>

        {!meetingPointSet && (
          <Text style={styles.status}>Waiting for the host to set the meeting point…</Text>
        )}

        {meetingPointSet && !hasSubmittedPreferences && (
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Preferences')}>
            <Text style={styles.primaryButtonText}>Submit your preferences</Text>
          </TouchableOpacity>
        )}

        {meetingPointSet && hasSubmittedPreferences && (
          <Text style={styles.status}>
            {snapshot.preferencesCount}/{snapshot.memberCount} submitted preferences
          </Text>
        )}

        {isHost && meetingPointSet && (
          <View style={styles.hostControls}>
            <Text style={styles.label}>How should we decide?</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.segment, mode === 'auto' && styles.segmentActive]}
                onPress={() => setMode('auto')}
              >
                <Text style={[styles.segmentText, mode === 'auto' && styles.segmentTextActive]}>Auto-pick</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segment, mode === 'swipe' && styles.segmentActive]}
                onPress={() => setMode('swipe')}
              >
                <Text style={[styles.segmentText, mode === 'swipe' && styles.segmentTextActive]}>Swipe together</Text>
              </TouchableOpacity>
            </View>

            {mode === 'swipe' && (
              <View style={styles.row}>
                {[5, 6, 8, 10].map((count) => (
                  <TouchableOpacity
                    key={count}
                    style={[styles.segment, swipeCount === count && styles.segmentActive]}
                    onPress={() => setSwipeCount(count)}
                  >
                    <Text style={[styles.segmentText, swipeCount === count && styles.segmentTextActive]}>{count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleStartMatching}
              disabled={starting || snapshot.preferencesCount === 0}
            >
              {starting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Find restaurants</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 24, gap: 10, alignItems: 'center', justifyContent: 'center' },
  codeLabel: { fontSize: 14, color: '#666' },
  code: { fontSize: 36, fontWeight: '800', letterSpacing: 6 },
  shareLink: { color: '#ff5a5f', fontWeight: '600', marginBottom: 8 },
  memberCount: { fontSize: 15, color: '#333', marginBottom: 8 },
  status: { fontSize: 15, color: '#555', textAlign: 'center', marginVertical: 8 },
  hostControls: { width: '100%', marginTop: 16, gap: 8 },
  label: { fontSize: 14, color: '#666' },
  row: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  segmentActive: { backgroundColor: '#222', borderColor: '#222' },
  segmentText: { fontWeight: '600', color: '#333' },
  segmentTextActive: { color: '#fff' },
  error: { color: '#d33', fontSize: 14 },
  primaryButton: { backgroundColor: '#ff5a5f', paddingVertical: 16, borderRadius: 999, marginTop: 8, width: '100%' },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
});
