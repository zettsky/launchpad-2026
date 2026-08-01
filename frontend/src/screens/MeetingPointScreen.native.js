import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../services/api';
import { useSession } from '../context/SessionContext';
import { useTheme } from '../context/ThemeContext';
import LocationAutocomplete from '../components/LocationAutocomplete';
// npx expo install react-native-maps
// npx expo install expo-location
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";

const ZONES = ['north', 'east', 'south', 'west', 'central'];

function formatDeadline(date) {
  if (!date) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
  const [deadlineDate, setDeadlineDate] = useState(null); // Date | null
  const [pickerStep, setPickerStep] = useState(null); // null | 'date' | 'time'
  const [error, setError] = useState(null);

  async function getCurrentLocation() {
    let { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
        return;
    }

    let location = await Location.getCurrentPositionAsync({});

    setSelectedLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
    });
}

  function handleDateChange(event, selected) {
    if (Platform.OS === 'android') {
      setPickerStep(null);
      if (event.type === 'dismissed') return;
    }
    if (selected) {
      setDeadlineDate((prev) => {
        const base = new Date(prev || Date.now());
        base.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
        return base;
      });
    }
    if (Platform.OS === 'android' && event.type !== 'dismissed') {
      setPickerStep('time');
    }
  }

  function handleTimeChange(event, selected) {
    if (Platform.OS === 'android') {
      setPickerStep(null);
      if (event.type === 'dismissed') return;
    }
    if (selected) {
      setDeadlineDate((prev) => {
        const base = new Date(prev || Date.now());
        base.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
        return base;
      });
    }
  }

  function confirmIOSStep() {
    setPickerStep(pickerStep === 'date' ? 'time' : null);
  }

  function clearDeadline() {
    setDeadlineDate(null);
    setPickerStep(null);
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
    if (deadlineDate) {
      if (deadlineDate.getTime() <= Date.now()) {
        setError('Deadline must be in the future');
        return;
      }
      payload.deadline = deadlineDate.toISOString();
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

              <MapView
                style={{
                  height: 300,
                  borderRadius: 12,
                  marginTop: 15,
                }}
                region={{
                  latitude: selectedLocation.latitude,
                  longitude: selectedLocation.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                onPress={(e) =>
                  setSelectedLocation(e.nativeEvent.coordinate)
                }
              >
                <Marker
                  coordinate={selectedLocation}
                  draggable
                  onDragEnd={(e) =>
                    setSelectedLocation(e.nativeEvent.coordinate)
                  }
                />
              </MapView>

              <TouchableOpacity
                style={commonStyles.filledButton}
                onPress={getCurrentLocation}
              >
                <Text style={commonStyles.filledButtonText}>
                  📍 Use Current Location
                </Text>
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
            <Text style={styles.label}>Deadline:</Text>
            <TouchableOpacity style={styles.deadlineInput} onPress={() => setPickerStep('date')}>
              <Text style={{ fontSize: 14, color: deadlineDate ? COLORS.text : COLORS.textMuted }}>
                {deadlineDate ? formatDeadline(deadlineDate) : 'Tap to set'}
              </Text>
            </TouchableOpacity>
          </View>
          {deadlineDate && (
            <TouchableOpacity onPress={clearDeadline}>
              <Text style={styles.clearLink}>Clear deadline</Text>
            </TouchableOpacity>
          )}
        </View>

        {pickerStep === 'date' && (
          <DateTimePicker
            value={deadlineDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}
        {pickerStep === 'time' && (
          <DateTimePicker
            value={deadlineDate || new Date()}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
            minimumDate={
              deadlineDate && deadlineDate.toDateString() === new Date().toDateString()
                ? new Date()
                : undefined
            }
          />
        )}
        {Platform.OS === 'ios' && pickerStep && (
          <TouchableOpacity style={styles.doneButtonSmall} onPress={confirmIOSStep}>
            <Text style={styles.doneButtonSmallText}>
              {pickerStep === 'date' ? 'Next: pick time' : 'Done'}
            </Text>
          </TouchableOpacity>
        )}

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
    input: { borderWidth: 2, borderColor: COLORS.primary, borderRadius: 10, padding: 12, fontSize: 15, color: COLORS.text },
    card: { borderWidth: 3, borderColor: COLORS.primary, borderRadius: 20, padding: 16, gap: 10 },
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
    deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    deadlineInput: { flex: 1, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16 },
    clearLink: { color: COLORS.danger, fontSize: 13, fontWeight: '600' },
    doneButtonSmall: { backgroundColor: COLORS.primary, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    doneButtonSmallText: { color: '#000', fontWeight: '700' },
    error: { color: '#d33', fontSize: 14 },
  });
}
