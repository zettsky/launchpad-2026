import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export const CUISINE_OPTIONS = [
  'Chinese', 'Malay', 'Japanese', 'Western', 'Indian', 'Korean', 'Thai', 'Italian',
];

export default function CuisineMultiSelect({ selected, onChange }) {
  function toggle(option) {
    if (selected.includes(option)) {
      onChange(selected.filter((c) => c !== option));
    } else {
      onChange([...selected, option]);
    }
  }

  return (
    <View style={styles.wrap}>
      {CUISINE_OPTIONS.map((option) => {
        const active = selected.includes(option);
        return (
          <TouchableOpacity
            key={option}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => toggle(option)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#ff5a5f', borderColor: '#ff5a5f' },
  chipText: { color: '#333', fontSize: 14 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
});
