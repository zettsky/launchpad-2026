import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { api } from '../services/api';
import { useSession } from '../context/SessionContext';

export default function JoinSessionScreen({ navigation }) {
  const { deviceId, startSession } = useSession();
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleJoin() {
    if (!code.trim()) {
      setError('Enter a session code');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const normalizedCode = code.trim().toUpperCase();
      const res = await api.joinSession(normalizedCode, deviceId, displayName || null);
      startSession({ code: normalizedCode, memberId: res.memberId, host: false });
      navigation.navigate('WaitingRoom');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Join a session</Text>
        <Text style={styles.label}>Session code</Text>
        <TextInput
          style={[styles.input, styles.codeInput]}
          value={code}
          onChangeText={setCode}
          placeholder="ABC123"
          autoCapitalize="characters"
          maxLength={6}
        />
        <Text style={styles.label}>Your name (optional)</Text>
        <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Guest" />
        {error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={styles.primaryButton} onPress={handleJoin} disabled={loading || !deviceId}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Join</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 12 },
  label: { fontSize: 14, color: '#666' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 16 },
  codeInput: { fontSize: 22, letterSpacing: 4, textAlign: 'center', fontWeight: '700' },
  error: { color: '#d33', fontSize: 14 },
  primaryButton: { backgroundColor: '#ff5a5f', paddingVertical: 16, borderRadius: 999, marginTop: 12 },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
});
