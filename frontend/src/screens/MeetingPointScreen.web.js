import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as Location from 'expo-location';
import { api } from '../services/api';
import { useSession } from '../context/SessionContext';
import { useTheme } from '../context/ThemeContext';
import LocationAutocomplete from '../components/LocationAutocomplete';

// Metro doesn't bundle Leaflet's default marker images correctly, so point them at a CDN instead.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Web fallback: react-native-maps doesn't run in the browser (see
// MeetingPointScreen.native.js for the map/search picker used on iOS/Android via Expo
// Go). Uses Leaflet + OpenStreetMap instead of Google Maps JS so this works without
// needing another Google Cloud API enabled/billed.
const ZONES = ['north', 'east', 'south', 'west', 'central'];

const todayStr = new Date().toISOString().split('T')[0];

function ClickToSetMarker({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return null;
}

function RecenterOnChange({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng]);
  return null;
}

export default function MeetingPointScreen({ navigation }) {
  const { code } = useSession();
  const { colors: COLORS, commonStyles } = useTheme();
  const styles = getStyles(COLORS);
  const [mode, setMode] = useState('pin'); // 'pin' | 'zone'
  const [selectedLocation, setSelectedLocation] = useState({
    latitude: 1.3521,
    longitude: 103.8198,
  });
  const [zone, setZone] = useState(null);
  const [deadlineDateStr, setDeadlineDateStr] = useState(''); // YYYY-MM-DD
  const [deadlineTimeStr, setDeadlineTimeStr] = useState(''); // HH:MM (24h)
  const [error, setError] = useState(null);

  async function getCurrentLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const location = await Location.getCurrentPositionAsync({});
      setSelectedLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (err) {
      // browser denied geolocation or it's unsupported; leave the pin where it was
    }
  }

  async function handleSubmit() {
    setError(null);
    const payload = {};
    if (mode === 'pin') {
      payload.lat = selectedLocation.latitude;
      payload.lng = selectedLocation.longitude;
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
              <LocationAutocomplete
                onSelectLocation={({ lat, lng }) => setSelectedLocation({ latitude: lat, longitude: lng })}
              />

              <View style={styles.mapWrapper}>
                <MapContainer
                  center={[selectedLocation.latitude, selectedLocation.longitude]}
                  zoom={15}
                  style={{ height: 300, width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <Marker
                    position={[selectedLocation.latitude, selectedLocation.longitude]}
                    draggable
                    eventHandlers={{
                      dragend: (e) => {
                        const { lat, lng } = e.target.getLatLng();
                        setSelectedLocation({ latitude: lat, longitude: lng });
                      },
                    }}
                  />
                  <ClickToSetMarker onSelect={setSelectedLocation} />
                  <RecenterOnChange lat={selectedLocation.latitude} lng={selectedLocation.longitude} />
                </MapContainer>
              </View>

              <TouchableOpacity style={commonStyles.filledButton} onPress={getCurrentLocation}>
                <Text style={commonStyles.filledButtonText}>📍 Use Current Location</Text>
              </TouchableOpacity>
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
              <input
                type="date"
                value={deadlineDateStr}
                onChange={(e) => setDeadlineDateStr(e.target.value)}
                min={todayStr}
                style={{
                  flex: 1,
                  border: `2px solid ${COLORS.primary}`,
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 15,
                  fontFamily: 'inherit',
                  backgroundColor: COLORS.cardBackground,
                  color: COLORS.text,
                }}
              />
              <input
                type="time"
                value={deadlineTimeStr}
                onChange={(e) => setDeadlineTimeStr(e.target.value)}
                style={{
                  flex: 1,
                  border: `2px solid ${COLORS.primary}`,
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 15,
                  fontFamily: 'inherit',
                  backgroundColor: COLORS.cardBackground,
                  color: COLORS.text,
                }}
              />
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
    label: { fontSize: 14, fontWeight: '700', color: COLORS.text },
    card: { borderWidth: 3, borderColor: COLORS.primary, borderRadius: 20, padding: 16, gap: 10 },
    section: { gap: 8 },
    mapWrapper: { borderRadius: 12, overflow: 'hidden' },
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
