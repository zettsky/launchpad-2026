import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../services/api';
import { useSession } from '../context/SessionContext';
// npx expo install react-native-maps
// npx expo install expo-location
// npm install react-native-google-places-autocomplete
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";

const ZONES = ['north', 'south', 'east', 'west', 'central'];

function formatDeadline(date) {
  if (!date) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function MeetingPointScreen({ navigation }) {
  const { code } = useSession();
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
        <Text style={styles.title}>Where's everyone meeting?</Text>

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
            <GooglePlacesAutocomplete
              placeholder="Search for a meeting point"
              fetchDetails={true}
              onPress={(data, details = null) => {
                if (details) {
                  setSelectedLocation({
                    latitude: details.geometry.location.lat,
                    longitude: details.geometry.location.lng,
                  });
                }
              }}
              query={{
                key: process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY,
                language: "en",
              }}
              styles={{
                textInput: styles.input,
               }}
            />

            <MapView
              style={{
                height: 350,
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
              style={styles.primaryButton}
              onPress={getCurrentLocation}
            >
              <Text style={styles.primaryButtonText}>
                📍 Use Current Location
              </Text>
            </TouchableOpacity>

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
        <TouchableOpacity style={styles.input} onPress={() => setPickerStep('date')}>
          <Text style={{ fontSize: 16, color: deadlineDate ? '#000' : '#999' }}>
            {deadlineDate ? formatDeadline(deadlineDate) : 'Tap to set date & time'}
          </Text>
        </TouchableOpacity>
        {deadlineDate && (
          <TouchableOpacity onPress={clearDeadline}>
            <Text style={styles.clearLink}>Clear deadline</Text>
          </TouchableOpacity>
        )}

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
  label: { fontSize: 14, color: '#666', marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 16, justifyContent: 'center' },
  clearLink: { color: '#ff5a5f', fontSize: 13, fontWeight: '600', marginTop: -6, marginBottom: 4 },
  doneButtonSmall: { backgroundColor: '#222', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  doneButtonSmallText: { color: '#fff', fontWeight: '600' },
  section: { gap: 8, marginBottom: 8 },
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
