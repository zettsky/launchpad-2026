import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { api } from '../services/api';
import { useSession } from '../context/SessionContext';
import { useTheme } from '../context/ThemeContext';

// Web fallback: react-native-maps doesn't run in the browser (see
// MeetingPointScreen.native.js for the real map/search picker used on iOS/Android via
// Expo Go). This keeps `expo start --web` usable for quick testing.
const ZONES = ['north', 'east', 'south', 'west', 'central'];

const todayStr = new Date().toISOString().split('T')[0];

export default function MeetingPointScreen({ navigation }) {
  const { code } = useSession();
  const { colors: COLORS, commonStyles } = useTheme();
  const styles = getStyles(COLORS);
  // Plain DOM <input> elements (not RN components) need a plain style object, not StyleSheet.create.
  const webInputStyle = {
    flex: 1,
    border: `2px solid ${COLORS.primary}`,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    fontFamily: 'inherit',
    backgroundColor: COLORS.cardBackground,
    color: COLORS.text,
  };
  const [mode, setMode] = useState('pin'); // 'pin' | 'zone'
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [zone, setZone] = useState(null);
  const [deadlineDateStr, setDeadlineDateStr] = useState(''); // YYYY-MM-DD
  const [deadlineTimeStr, setDeadlineTimeStr] = useState(''); // HH:MM (24h)
  const [error, setError] = useState(null);

  async function handleSubmit() {
    setError(null);
    const payload = {};
    if (mode === 'pin') {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
        setError('Enter valid latitude and longitude');
        return;
      }
      payload.lat = latNum;
      payload.lng = lngNum;
    } else {
      if (!zone) {
        setError('Pick a zone');
        return;
      }
      payload.zone = zone;
    }
    if (deadlineDateStr && deadlineTimeStr) {
      const combined = new Date(`${deadlineDateStr}T${deadlineTimeStr}:00`);
      if (Number.isNaN(combined.getTime())) {
        setError('Enter a valid deadline date and time');
        return;
      }
      if (combined.getTime() <= Date.now()) {
        setError('Deadline must be in the future');
        return;
      }
      payload.deadline = combined.toISOString();
    }

    try {
      await api.setMeetingPoint(code, payload);
      navigation.navigate('WaitingRoom');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Meet Where?</Text>
        <Text style={styles.webNote}>(Web preview — the map/search picker is on the mobile app)</Text>

        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleButton, mode === 'pin' && styles.toggleButtonActive]}
            onPress={() => setMode('pin')}
          >
            <Text style={[styles.toggleText, mode === 'pin' && styles.toggleTextActive]}>Specific location</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, mode === 'zone' && styles.toggleButtonActive]}
            onPress={() => setMode('zone')}
          >
            <Text style={[styles.toggleText, mode === 'zone' && styles.toggleTextActive]}>General Area</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {mode === 'pin' ? (
            <View style={styles.section}>
              <Text style={styles.label}>Latitude</Text>
              <TextInput style={styles.input} value={lat} onChangeText={setLat} keyboardType="numeric" placeholder="1.3048" placeholderTextColor={COLORS.textMuted} />
              <Text style={styles.label}>Longitude</Text>
              <TextInput style={styles.input} value={lng} onChangeText={setLng} keyboardType="numeric" placeholder="103.8318" placeholderTextColor={COLORS.textMuted} />
            </View>
          ) : (
            <View style={styles.zoneGrid}>
              {ZONES.map((z) => (
                <TouchableOpacity
                  key={z}
                  style={[styles.zoneButton, zone === z && styles.zoneButtonActive]}
                  onPress={() => setZone(z)}
                >
                  <Text style={[styles.zoneText, zone === z && styles.zoneTextActive]}>{z}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.deadlineRow}>
            <Text style={styles.label}>deadline:</Text>
            <View style={styles.dateTimeRow}>
              <input type="date" value={deadlineDateStr} onChange={(e) => setDeadlineDateStr(e.target.value)} min={todayStr} style={webInputStyle} />
              <input type="time" value={deadlineTimeStr} onChange={(e) => setDeadlineTimeStr(e.target.value)} style={webInputStyle} />
            </View>
          </View>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={commonStyles.outlineButton} onPress={handleSubmit}>
          <Text style={commonStyles.outlineButtonText}>Next</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(COLORS) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: 24, gap: 12 },
    title: { fontSize: 36, fontWeight: '900', color: COLORS.text },
    webNote: { fontSize: 12, color: COLORS.textMuted, marginTop: -6, marginBottom: 4 },
    label: { fontSize: 14, fontWeight: '700', color: COLORS.text },
    input: { borderWidth: 2, borderColor: COLORS.primary, borderRadius: 10, padding: 12, fontSize: 15, color: COLORS.text },
    card: { borderWidth: 3, borderColor: COLORS.primary, borderRadius: 20, padding: 16, gap: 12 },
    section: { gap: 8 },
    toggleRow: { flexDirection: 'row', gap: 8 },
    toggleButton: { flex: 1, paddingVertical: 14, borderRadius: 999, backgroundColor: COLORS.chipInactive, alignItems: 'center' },
    toggleButtonActive: { backgroundColor: COLORS.primary },
    toggleText: { fontWeight: '700', color: COLORS.text },
    toggleTextActive: { color: '#000' },
    zoneGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    zoneButton: { width: '47%', paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.chipInactive, alignItems: 'center' },
    zoneButtonActive: { backgroundColor: COLORS.primary },
    zoneText: { fontWeight: '700', color: COLORS.text, textTransform: 'capitalize' },
    zoneTextActive: { color: '#000' },
    deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
    dateTimeRow: { flexDirection: 'row', gap: 8, flex: 1 },
    error: { color: '#d33', fontSize: 14 },
  });
}
