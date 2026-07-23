import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { api } from '../services/api';
import { useSession } from '../context/SessionContext';

export default function HomeScreen({ navigation }) {
  const { deviceId, code, snapshot, startSession, resetSession } = useSession();
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);

  async function handleJoin() {
    if (!joinCode.trim()) return;
    setJoining(true);
    setError(null);
    try {
      const normalizedCode = joinCode.trim().toUpperCase();
      const res = await api.joinSession(normalizedCode, deviceId, null);
      startSession({ code: normalizedCode, memberId: res.memberId, host: false });
      setJoinCode('');
      navigation.navigate('WaitingRoom');
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Launchpad</Text>
        <TouchableOpacity style={styles.profileButton} onPress={() => {}}>
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.joinRow}>
          <Text style={styles.joinLabel}>Join with code:</Text>
          <TextInput
            style={styles.joinInput}
            value={joinCode}
            onChangeText={setJoinCode}
            placeholder="ABC123"
            autoCapitalize="characters"
            maxLength={6}
            onSubmitEditing={handleJoin}
          />
        </View>
        {joining && <ActivityIndicator style={{ marginBottom: 8 }} />}
        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.hostButton} onPress={() => navigation.navigate('CreateSession')}>
          <Text style={styles.hostButtonText}>+</Text>
        </TouchableOpacity>

        {code && (
          <TouchableOpacity style={styles.sessionCard} onPress={() => navigation.navigate('WaitingRoom')}>
            <TouchableOpacity style={styles.dismissButton} onPress={resetSession}>
              <Text style={styles.dismissText}>×</Text>
            </TouchableOpacity>
            <Text style={styles.sessionCode}>Session {code}</Text>
            <View style={styles.sessionRow}>
              <Text style={styles.sessionMeta}>
                Deadline: {snapshot?.deadline ? new Date(snapshot.deadline).toLocaleString() : 'None'}
              </Text>
              <Text style={styles.sessionMeta}>
                Selected: {snapshot?.preferencesCount ?? 0}/{snapshot?.memberCount ?? 0}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  title: { fontSize: 32, fontWeight: '800' },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#cfe2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: { fontSize: 22 },
  content: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  joinRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  joinLabel: { fontSize: 16, fontWeight: '700' },
  joinInput: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#ebebeb',
  },
  error: { color: '#d33', fontSize: 14, marginBottom: 8 },
  hostButton: {
    backgroundColor: '#ebebeb',
    paddingVertical: 28,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  hostButtonText: { color: '#888', fontSize: 40, fontWeight: '300', lineHeight: 42 },
  sessionCard: {
    backgroundColor: '#ebebeb',
    borderRadius: 20,
    padding: 20,
    width: '100%',
  },
  dismissButton: { position: 'absolute', top: 12, right: 16 },
  dismissText: { fontSize: 20, color: '#888' },
  sessionCode: { fontSize: 16, color: '#333', marginBottom: 12 },
  sessionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sessionMeta: { fontSize: 14, color: '#555' },
});