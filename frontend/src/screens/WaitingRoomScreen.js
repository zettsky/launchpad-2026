import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { api } from '../services/api';
import { useSession } from '../context/SessionContext';
import { shareText } from '../services/share';
import { useTheme } from '../context/ThemeContext';

export default function WaitingRoomScreen({ navigation }) {
  const { code, deviceId, isHost, snapshot, hasSubmittedPreferences } = useSession();
  const { colors: COLORS, commonStyles } = useTheme();
  const styles = getStyles(COLORS);
  const [mode, setMode] = useState('swipe');
  const [swipeCount, setSwipeCount] = useState(5);
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
    await shareText(`Join my EatWhere! session! Code: ${code}`);
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
        <Text style={styles.codeLabel}>Your Code:</Text>
        <Text style={styles.code}>{code}</Text>
        <TouchableOpacity onPress={handleShare}>
          <Text style={styles.shareLink}>Share code</Text>
        </TouchableOpacity>

        <Text style={styles.memberCount}>{snapshot.memberCount} in the group</Text>

        {!meetingPointSet && (
          isHost ? (
            <TouchableOpacity style={commonStyles.filledButton} onPress={() => navigation.navigate('MeetingPoint')}>
              <Text style={commonStyles.filledButtonText}>Set meeting point</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.status}>Waiting for the host to set the meeting point…</Text>
          )
        )}

        {meetingPointSet && !hasSubmittedPreferences && (
          <TouchableOpacity
            style={[commonStyles.filledButton, styles.idLikeButton]}
            onPress={() => navigation.navigate('Preferences')}
          >
            <Text style={commonStyles.filledButtonText}>I'd like...</Text>
          </TouchableOpacity>
        )}

        {meetingPointSet && hasSubmittedPreferences && (
          <Text style={styles.status}>Preferences submitted!</Text>
        )}

        {isHost && meetingPointSet && (
          <View style={styles.hostControls}>
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
                <Text style={[styles.segmentText, mode === 'swipe' && styles.segmentTextActive]}>Group Swipe</Text>
              </TouchableOpacity>
            </View>

            {mode === 'swipe' && (
              <View style={styles.row}>
                {[5, 10].map((count) => (
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
              style={commonStyles.outlineButton}
              onPress={handleStartMatching}
              disabled={starting || snapshot.preferencesCount === 0}
            >
              {starting ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <Text style={commonStyles.outlineButtonText}>Eat Where?</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function getStyles(COLORS) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { flex: 1, padding: 24, gap: 10, alignItems: 'center', justifyContent: 'center' },
    codeLabel: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    code: { fontSize: 40, fontWeight: '900', letterSpacing: 6, color: COLORS.primaryDark },
    shareLink: { color: COLORS.primaryDark, fontWeight: '600', marginBottom: 8 },
    memberCount: { fontSize: 15, color: COLORS.textMuted, marginBottom: 8 },
    status: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', marginVertical: 8 },
    idLikeButton: { width: '85%', paddingHorizontal: 40 },
    hostControls: { width: '100%', marginTop: 16, gap: 8 },
    row: { flexDirection: 'row', gap: 8 },
    segment: { flex: 1, paddingVertical: 12, borderRadius: 999, backgroundColor: COLORS.chipInactive, alignItems: 'center' },
    segmentActive: { backgroundColor: COLORS.primary },
    segmentText: { fontWeight: '700', color: COLORS.text },
    segmentTextActive: { color: '#000' },
    error: { color: '#d33', fontSize: 14 },
  });
}
