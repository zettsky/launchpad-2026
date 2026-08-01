import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { api } from '../services/api';
import { useSession } from '../context/SessionContext';
import { useTheme } from '../context/ThemeContext';

export default function JoinSessionScreen({ navigation }) {
  const { deviceId, startSession } = useSession();
  const { colors: COLORS, commonStyles } = useTheme();
  const styles = getStyles(COLORS);
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
      const res = await api.joinSession(code, deviceId, displayName || null);
      startSession({ code, memberId: res.memberId, host: false });
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
          onChangeText={(text) => setCode(text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
          placeholder="ABC123"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="characters"
          maxLength={6}
        />
        <Text style={styles.label}>Your name (optional)</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Guest"
          placeholderTextColor={COLORS.textMuted}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={commonStyles.filledButton} onPress={handleJoin} disabled={loading || !deviceId}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={commonStyles.filledButtonText}>Join</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function getStyles(COLORS) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
    title: { fontSize: 32, fontWeight: '900', color: COLORS.text, marginBottom: 12 },
    label: { fontSize: 14, color: COLORS.textMuted },
    input: { borderWidth: 2, borderColor: COLORS.primary, borderRadius: 14, padding: 14, fontSize: 16, color: COLORS.text },
    codeInput: { fontSize: 22, letterSpacing: 4, textAlign: 'center', fontWeight: '700' },
    error: { color: '#d33', fontSize: 14 },
  });
}
