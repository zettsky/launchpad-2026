import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { api } from '../services/api';
import { useSession } from '../context/SessionContext';
// npx expo install react-native-maps
// npx expo install expo-location
// npm install react-native-google-places-autocomplete
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";

const ZONES = ['north', 'south', 'east', 'west', 'central'];

export default function MeetingPointScreen({ navigation }) {
  const { code } = useSession();
  const [mode, setMode] = useState('pin'); // 'pin' | 'zone'
  const [selectedLocation, setSelectedLocation] = useState({
    latitude: 1.3521,
    longitude: 103.8198,
  });
  const [zone, setZone] = useState(null);
  const [deadlineMinutes, setDeadlineMinutes] = useState('');
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

  async function handleSubmit() {
    setError(null);
    const payload = {};
    if (mode === 'pin') {
      payload.lat = selectedLocation.latitude;
      payload.lng = selectedLocation.longitude;
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
    if (deadlineMinutes.trim()) {
      const minutes = parseInt(deadlineMinutes, 10);
      if (!Number.isNaN(minutes) && minutes > 0) {
        payload.deadline = new Date(Date.now() + minutes * 60000).toISOString();
      }
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
                key: "YOUR_GOOGLE_API_KEY",
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

        <Text style={styles.label}>Deadline (optional, minutes from now)</Text>
        <TextInput
          style={styles.input}
          value={deadlineMinutes}
          onChangeText={(text) => setDeadlineMinutes(text.replace(/[^0-9]/g, ''))}
          keyboardType="numeric"
          placeholder="e.g. 15"
        />

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
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 16 },
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
// ignore