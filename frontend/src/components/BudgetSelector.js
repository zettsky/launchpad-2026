import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Each tier maps to a small overlapping range on the 0-4 price scale (matches Google's
// PRICE_LEVEL enum) so adjacent members' picks can still intersect in the matching engine.
export const BUDGET_TIERS = [
  { label: '$', min: 0, max: 1 },
  { label: '$$', min: 1, max: 2 },
  { label: '$$$', min: 2, max: 3 },
  { label: '$$$$', min: 3, max: 4 },
];

export default function BudgetSelector({ value, onChange }) {
  return (
    <View style={styles.row}>
      {BUDGET_TIERS.map((tier) => {
        const active = value?.label === tier.label;
        return (
          <TouchableOpacity
            key={tier.label}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(tier)}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{tier.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  segmentActive: { backgroundColor: '#222', borderColor: '#222' },
  segmentText: { fontSize: 16, fontWeight: '600', color: '#333' },
  segmentTextActive: { color: '#fff' },
});
