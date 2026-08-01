import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { api } from '../services/api';
import { useSession } from '../context/SessionContext';
import SwipeToDeleteRow from '../components/SwipeToDeleteRow';
import { useTheme } from '../context/ThemeContext';

export default function HomeScreen({ navigation }) {
  const { deviceId, startSession } = useSession();
  const { colors: COLORS, commonStyles, mode, setThemeMode } = useTheme();
  const styles = getStyles(COLORS);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const res = await api.listDeviceSessions(deviceId);
      setSessions(res.sessions);
    } catch (err) {
      // keep whatever list was already shown rather than clearing it on a transient error
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadSessions);
    return unsubscribe;
  }, [navigation, loadSessions]);

  function handleResume(item) {
    startSession({ code: item.code, memberId: item.memberId, host: item.isHost });
    navigation.navigate('WaitingRoom');
  }

  async function handleDismiss(item) {
    setSessions((prev) => prev.filter((s) => s.code !== item.code));
    try {
      await api.dismissSession(item.code, item.memberId);
    } catch (err) {
      // already removed locally; a failed dismiss call just means it may reappear on next load
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>EatWhere!</Text>
          <TouchableOpacity style={styles.profileButton} onPress={() => setProfileMenuOpen(true)}>
            <Text style={styles.profileButtonText}>👤</Text>
          </TouchableOpacity>
        </View>

        {profileMenuOpen && (
          <Modal visible transparent animationType="fade" onRequestClose={() => setProfileMenuOpen(false)}>
            <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setProfileMenuOpen(false)}>
              <View style={styles.sheet}>
                <Text style={styles.sheetTitle}>Appearance</Text>
                <TouchableOpacity
                  style={[styles.modeOption, mode === 'light' && styles.modeOptionActive]}
                  onPress={() => { setThemeMode('light'); setProfileMenuOpen(false); }}
                >
                  <Text style={[styles.modeOptionText, mode === 'light' && styles.modeOptionTextActive]}>
                    ☀️ Light mode
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeOption, mode === 'dark' && styles.modeOptionActive]}
                  onPress={() => { setThemeMode('dark'); setProfileMenuOpen(false); }}
                >
                  <Text style={[styles.modeOptionText, mode === 'dark' && styles.modeOptionTextActive]}>
                    🌙 Dark mode
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        <View style={styles.sessionsBox}>
          <Text style={styles.sessionsHeader}>
            You have {sessions.length} ongoing session{sessions.length === 1 ? '' : 's'}
          </Text>
          <ScrollView style={styles.sessionsScroll} contentContainerStyle={{ gap: 10 }}>
            {loading && sessions.length === 0 && <ActivityIndicator style={{ marginTop: 20 }} />}
            {sessions.map((item) => (
              <SwipeToDeleteRow key={item.code} onDelete={() => handleDismiss(item)}>
                <TouchableOpacity style={styles.sessionCard} onPress={() => handleResume(item)}>
                  <Text style={styles.sessionTitle} numberOfLines={1}>
                    {item.groupName || item.code} · {item.code}
                  </Text>
                  <Text style={styles.sessionHost}>Host: {item.hostName || 'Unknown'}</Text>
                  <View style={styles.sessionRow}>
                    <Text style={styles.sessionMeta}>
                      Deadline: {item.deadline ? new Date(item.deadline).toLocaleString() : 'None'}
                    </Text>
                    <Text style={styles.sessionMeta}>
                      Submitted: {item.preferencesCount}/{item.memberCount}
                    </Text>
                  </View>
                </TouchableOpacity>
              </SwipeToDeleteRow>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity style={commonStyles.filledButton} onPress={() => navigation.navigate('CreateSession')}>
          <Text style={commonStyles.filledButtonText}>Create new session</Text>
        </TouchableOpacity>
        <TouchableOpacity style={commonStyles.filledButton} onPress={() => navigation.navigate('JoinSession')}>
          <Text style={commonStyles.filledButtonText}>Join existing session</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function getStyles(COLORS) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { flex: 1, padding: 24, gap: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 44, fontWeight: '900', color: COLORS.text, textAlign: 'left' },
    profileButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      borderColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.cardBackground,
    },
    profileButtonText: { fontSize: 20 },
    backdrop: { flex: 1, backgroundColor: COLORS.modalBackdrop, justifyContent: 'center', padding: 24 },
    sheet: { backgroundColor: COLORS.cardBackground, borderRadius: 20, padding: 20, gap: 10 },
    sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
    modeOption: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 14,
      backgroundColor: COLORS.chipInactive,
    },
    modeOptionActive: { backgroundColor: COLORS.primary },
    modeOptionText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
    modeOptionTextActive: { color: '#000', fontWeight: '800' },
    sessionsBox: {
      borderWidth: 3,
      borderColor: COLORS.primary,
      borderRadius: 24,
      padding: 16,
      maxHeight: 380,
    },
    sessionsHeader: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
    sessionsScroll: { flexGrow: 0 },
    sessionCard: {
      borderWidth: 2,
      borderColor: COLORS.primary,
      borderRadius: 18,
      padding: 14,
    },
    sessionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
    sessionHost: { fontSize: 13, color: COLORS.textMuted, marginBottom: 6 },
    sessionRow: { flexDirection: 'row', justifyContent: 'space-between' },
    sessionMeta: { fontSize: 12, color: COLORS.textMuted },
  });
}
