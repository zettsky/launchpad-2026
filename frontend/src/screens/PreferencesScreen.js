import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { api } from '../services/api';
import { useSession } from '../context/SessionContext';
import CuisineMultiSelect from '../components/CuisineMultiSelect';
import BudgetSelector, { BUDGET_TIERS } from '../components/BudgetSelector';

const DIETARY_OPTIONS = ['Halal', 'Vegetarian', 'Allergies'];

export default function PreferencesScreen({ navigation }) {
  const { code, memberId, setHasSubmittedPreferences } = useSession();
  const [cuisines, setCuisines] = useState([]);
  const [budget, setBudget] = useState(BUDGET_TIERS[1]);
  const [dietary, setDietary] = useState([]);
  const [error, setError] = useState(null);

  function toggleDietary(option) {
    setDietary((prev) => (prev.includes(option) ? prev.filter((d) => d !== option) : [...prev, option]));
  }

  async function handleSubmit() {
    if (cuisines.length === 0) {
      setError('Pick at least one cuisine');
      return;
    }
    setError(null);
    try {
      await api.submitPreferences(code, {
        memberId,
        cuisines,
        budgetMin: budget.min,
        budgetMax: budget.max,
        dietary,
      });
      setHasSubmittedPreferences(true);
      navigation.navigate('WaitingRoom');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your preferences</Text>
        <Text style={styles.note}>Submitted anonymously — no one else sees your individual picks.</Text>

        <Text style={styles.label}>Cuisine (pick any)</Text>
        <CuisineMultiSelect selected={cuisines} onChange={setCuisines} />

        <Text style={styles.label}>Budget</Text>
        <BudgetSelector value={budget} onChange={setBudget} />

        <Text style={styles.label}>Dietary restrictions (optional)</Text>
        <View style={styles.dietaryRow}>
          {DIETARY_OPTIONS.map((option) => {
            const active = dietary.includes(option);
            return (
              <TouchableOpacity
                key={option}
                style={[styles.dietaryChip, active && styles.dietaryChipActive]}
                onPress={() => toggleDietary(option)}
              >
                <Text style={[styles.dietaryText, active && styles.dietaryTextActive]}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
          <Text style={styles.primaryButtonText}>Submit</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '800' },
  note: { fontSize: 13, color: '#888', marginBottom: 8 },
  label: { fontSize: 14, color: '#666', marginTop: 8, fontWeight: '600' },
  dietaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dietaryChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: '#ddd' },
  dietaryChipActive: { backgroundColor: '#222', borderColor: '#222' },
  dietaryText: { color: '#333' },
  dietaryTextActive: { color: '#fff' },
  error: { color: '#d33', fontSize: 14 },
  primaryButton: { backgroundColor: '#ff5a5f', paddingVertical: 16, borderRadius: 999, marginTop: 16 },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
});
