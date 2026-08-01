import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { api } from '../services/api';
import { useSession } from '../context/SessionContext';

// Web fallback: react-native-maps and react-native-google-places-autocomplete don't run
// in the browser (see MeetingPointScreen.native.js for the real map/search picker used on
// iOS/Android via Expo Go). This keeps `expo start --web` usable for quick testing.
const ZONES = ['north', 'south', 'east', 'west', 'central'];

// Plain DOM <input> elements (not RN components) need a plain style object, not StyleSheet.create.
const webInputStyle = {
  flex: 1,
  border: '1px solid #ddd',
  borderRadius: 10,
  padding: 14,
  fontSize: 16,
  fontFamily: 'inherit',
};

export default function MeetingPointScreen({ navigation }) {
  const { code } = useSession();
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
        <Text style={styles.title}>Where's everyone meeting?</Text>
        <Text style={styles.webNote}>(Web preview — the map/search picker is on the mobile app)</Text>

        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleButton, mode === 'pin' && styles.toggleButtonActive]}
            onPress={() => setMode('pin')}
          >
            <Text style={[styles.toggleText, mode === 'pin' && styles.toggleTextActive]}>Exact address</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, mode === 'zone' && styles.toggleButtonActive]}
            onPress={() => setMode('zone')}
          >
            <Text style={[styles.toggleText, mode === 'zone' && styles.toggleTextActive]}>General zone</Text>
          </TouchableOpacity>
        </View>

        {mode === 'pin' ? (
          <View style={styles.section}>
            <Text style={styles.label}>Latitude</Text>
            <TextInput style={styles.input} value={lat} onChangeText={setLat} keyboardType="numeric" placeholder="1.3048" />
            <Text style={styles.label}>Longitude</Text>
            <TextInput style={styles.input} value={lng} onChangeText={setLng} keyboardType="numeric" placeholder="103.8318" />
          </View>
        ) : (
          <View style={styles.section}>
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
          </View>
        )}

        <Text style={styles.label}>Deadline (optional)</Text>
        <View style={styles.dateTimeRow}>
          <input
            type="date"
            value={deadlineDateStr}
            onChange={(e) => setDeadlineDateStr(e.target.value)}
            style={webInputStyle}
          />
          <input
            type="time"
            value={deadlineTimeStr}
            onChange={(e) => setDeadlineTimeStr(e.target.value)}
            style={webInputStyle}
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  webNote: { fontSize: 12, color: '#999', marginTop: -8, marginBottom: 8 },
  label: { fontSize: 14, color: '#666', marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 16 },
  section: { gap: 8, marginBottom: 8 },
  dateTimeRow: { flexDirection: 'row', gap: 8 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  toggleButton: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  toggleButtonActive: { backgroundColor: '#222', borderColor: '#222' },
  toggleText: { fontWeight: '600', color: '#333' },
  toggleTextActive: { color: '#fff' },
  zoneGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  zoneButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  zoneButtonActive: { backgroundColor: '#ff5a5f', borderColor: '#ff5a5f' },
  zoneText: { fontWeight: '600', color: '#333', textTransform: 'capitalize' },
  zoneTextActive: { color: '#fff' },
  error: { color: '#d33', fontSize: 14 },
  primaryButton: { backgroundColor: '#ff5a5f', paddingVertical: 16, borderRadius: 999, marginTop: 12 },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
});
