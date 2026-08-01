import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { api } from '../services/api';
import { useSession } from '../context/SessionContext';
import DropdownSelect from '../components/DropdownSelect';
import { CUISINE_OPTIONS } from '../components/CuisineMultiSelect';
import { BUDGET_TIERS } from '../components/BudgetSelector';
import { useTheme } from '../context/ThemeContext';

const BUDGET_LABELS = BUDGET_TIERS.map((t) => t.label);
const DIETARY_OPTIONS = ['Halal', 'Vegetarian', 'Allergies'];

export default function PreferencesScreen({ navigation }) {
  const { code, memberId, setHasSubmittedPreferences } = useSession();
  const { colors: COLORS, commonStyles } = useTheme();
  const styles = getStyles(COLORS);
  const [cuisines, setCuisines] = useState([]);
  const [budgetLabel, setBudgetLabel] = useState([BUDGET_LABELS[1]]);
  const [dietary, setDietary] = useState([]);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    if (cuisines.length === 0) {
      setError('Pick at least one cuisine');
      return;
    }
    setError(null);
    const budget = BUDGET_TIERS.find((t) => t.label === budgetLabel[0]) || BUDGET_TIERS[1];
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
        <Text style={styles.title}>I'd like...</Text>
        <Text style={styles.note}>Submitted anonymously.</Text>

        <Text style={styles.label}>Cuisine:</Text>
        <DropdownSelect
          label="Pick cuisines"
          options={CUISINE_OPTIONS}
          selected={cuisines}
          onChange={setCuisines}
          multi
          placeholder="What are you craving?"
        />

        <Text style={styles.label}>Budget</Text>
        <DropdownSelect
          label="Pick a budget"
          options={BUDGET_LABELS}
          selected={budgetLabel}
          onChange={setBudgetLabel}
          multi={false}
          placeholder="What's your budget?"
        />

        <Text style={styles.label}>Dietary restrictions</Text>
        <DropdownSelect
          label="Dietary restrictions"
          options={DIETARY_OPTIONS}
          selected={dietary}
          onChange={setDietary}
          multi
          placeholder="Any restrictions?"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={commonStyles.outlineButton} onPress={handleSubmit}>
          <Text style={commonStyles.outlineButtonText}>Submit</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(COLORS) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: 24, gap: 10 },
    title: { fontSize: 40, fontWeight: '900', color: COLORS.text },
    note: { fontSize: 13, color: COLORS.textMuted, marginBottom: 8 },
    label: { fontSize: 16, color: COLORS.text, marginTop: 8 },
    error: { color: '#d33', fontSize: 14 },
  });
}
