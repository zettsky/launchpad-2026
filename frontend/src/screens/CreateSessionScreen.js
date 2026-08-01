import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { api } from '../services/api';
import { useSession } from '../context/SessionContext';
import { useTheme } from '../context/ThemeContext';

export default function CreateSessionScreen({ navigation }) {
  const { deviceId, startSession } = useSession();
  const { colors: COLORS, commonStyles } = useTheme();
  const styles = getStyles(COLORS);
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
        <Text style={styles.title}>Create a session</Text>

        <Text style={styles.label}>Group name</Text>
        <TextInput
          style={styles.input}
          value={groupName}
          onChangeText={setGroupName}
          placeholder="Group name here"
          placeholderTextColor={COLORS.textMuted}
        />

        <Text style={styles.label}>Makan leader</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name here"
          placeholderTextColor={COLORS.textMuted}
        />

        {error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={commonStyles.filledButton} onPress={handleCreate} disabled={loading || !deviceId}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={commonStyles.filledButtonText}>Start!</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function getStyles(COLORS) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    // marginTop offsets the nav header's height so the block centers on the whole
    // screen, not just the space below the header.
    content: { flex: 1, padding: 24, gap: 12, justifyContent: 'center', marginTop: -28 },
    title: { fontSize: 40, fontWeight: '900', color: COLORS.text, marginBottom: 16 },
    label: { fontSize: 16, fontWeight: '700', color: COLORS.text },
    input: { borderWidth: 2, borderColor: COLORS.primary, borderRadius: 14, padding: 14, fontSize: 16, color: COLORS.text },
    error: { color: '#d33', fontSize: 14 },
  });
}
