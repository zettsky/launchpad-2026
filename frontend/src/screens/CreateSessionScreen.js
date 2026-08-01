import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { api } from '../services/api';
import { useSession } from '../context/SessionContext';

export default function CreateSessionScreen({ navigation }) {
  const { deviceId, startSession } = useSession();
  const [displayName, setDisplayName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleCreate() {
    if (!groupName.trim() || !displayName.trim()) {
      setError('Group name and your name are both required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.createSession(deviceId, displayName.trim(), groupName.trim());
      startSession({ code: res.code, memberId: res.memberId, host: true });
      navigation.navigate('MeetingPoint');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Start a session</Text>

        <Text style={styles.label}>Group name</Text>
        <TextInput
          style={styles.input}
          value={groupName}
          onChangeText={setGroupName}
          placeholder="e.g. Friday Dinner Crew"
        />

        <Text style={styles.label}>Your name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Host"
        />

        {error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={styles.primaryButton} onPress={handleCreate} disabled={loading || !deviceId}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Create session</Text>}
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
  error: { color: '#d33', fontSize: 14 },
  primaryButton: { backgroundColor: '#ff5a5f', paddingVertical: 16, borderRadius: 999, marginTop: 12 },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
});
