import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const DEBOUNCE_MS = 300;

// Custom search-as-you-type replacement for `react-native-google-places-autocomplete`,
// which called Google's legacy Autocomplete API — not enabled on this project (same
// restriction as the legacy Places Text Search hit earlier). This calls our own backend,
// which uses Places API (New) autocomplete instead.
export default function LocationAutocomplete({ onSelectLocation, placeholder = 'Search for a meeting point' }) {
  const { colors: COLORS } = useTheme();
  const styles = getStyles(COLORS);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSuggestions([]);
      return undefined;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.autocompleteLocation(query);
        setSuggestions(res.suggestions || []);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  async function handleSelect(suggestion) {
    setQuery(suggestion.mainText);
    setSuggestions([]);
    try {
      const details = await api.getPlaceLocation(suggestion.placeId);
      if (details.lat != null && details.lng != null) {
        onSelectLocation({ lat: details.lat, lng: details.lng, description: suggestion.mainText });
      }
    } catch (err) {
      // leave the text filled in but don't move the map pin if resolution failed
    }
  }

  return (
    <View>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
      />
      {loading && <ActivityIndicator style={styles.loading} size="small" color={COLORS.primary} />}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsBox}>
          {suggestions.map((s) => (
            <TouchableOpacity key={s.placeId} style={styles.suggestionRow} onPress={() => handleSelect(s)}>
              <Text style={styles.mainText} numberOfLines={1}>{s.mainText}</Text>
              {!!s.secondaryText && (
                <Text style={styles.secondaryText} numberOfLines={1}>{s.secondaryText}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function getStyles(COLORS) {
  return StyleSheet.create({
    input: { borderWidth: 2, borderColor: COLORS.primary, borderRadius: 10, padding: 12, fontSize: 15, color: COLORS.text },
    loading: { position: 'absolute', right: 14, top: 14 },
    suggestionsBox: {
      borderWidth: 2,
      borderColor: COLORS.primary,
      borderTopWidth: 0,
      borderBottomLeftRadius: 10,
      borderBottomRightRadius: 10,
      backgroundColor: COLORS.cardBackground,
      marginTop: -2,
    },
    suggestionRow: { paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: COLORS.chipInactive },
    mainText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
    secondaryText: { fontSize: 12, color: COLORS.textMuted },
  });
}
