import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Lightweight custom dropdown (Modal + option list) rather than a picker library, so it
// behaves identically on web and native without a platform split. Supports both
// single-select (multi=false) and multi-select (multi=true, default) option lists.
//
// The Modal is conditionally rendered (`{open && <Modal>...}`) rather than toggled via
// `visible` on an always-mounted instance: react-native-web doesn't reliably re-hide an
// already-mounted Modal when `visible` flips back to false (verified — the `open` state
// updates correctly, but the modal stayed on screen). Mounting/unmounting instead forces
// a real close every time, on both web and native.
export default function DropdownSelect({ label, options, selected, onChange, multi = true, placeholder }) {
  const { colors: COLORS } = useTheme();
  const styles = getStyles(COLORS);
  const [open, setOpen] = useState(false);

  function toggleOption(option) {
    if (multi) {
      if (selected.includes(option)) {
        onChange(selected.filter((o) => o !== option));
      } else {
        onChange([...selected, option]);
      }
    } else {
      onChange([option]);
      setOpen(false);
    }
  }

  const summary = selected.length > 0 ? selected.join(', ') : placeholder;

  return (
    <View>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.triggerText} numberOfLines={1}>{summary}</Text>
      </TouchableOpacity>

      {open && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <ScrollView style={styles.optionsScroll}>
                {options.map((option) => {
                  const active = selected.includes(option);
                  return (
                    <TouchableOpacity key={option} style={styles.option} onPress={() => toggleOption(option)}>
                      <Text style={[styles.optionText, active && styles.optionTextActive]}>
                        {active ? '✓ ' : ''}{option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity style={styles.doneButton} onPress={() => setOpen(false)}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

function getStyles(COLORS) {
  return StyleSheet.create({
    trigger: {
      backgroundColor: COLORS.primary,
      borderRadius: 999,
      paddingVertical: 16,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    triggerText: { color: '#000', fontWeight: '700', fontSize: 15 },
    backdrop: { flex: 1, backgroundColor: COLORS.modalBackdrop, justifyContent: 'center', padding: 24 },
    sheet: { backgroundColor: COLORS.cardBackground, borderRadius: 20, padding: 20, maxHeight: '70%' },
    sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
    optionsScroll: { marginBottom: 12 },
    option: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.chipInactive },
    optionText: { fontSize: 16, color: COLORS.text },
    optionTextActive: { fontWeight: '700', color: COLORS.primaryDark },
    doneButton: { backgroundColor: COLORS.primary, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
    doneButtonText: { color: '#000', fontWeight: '800' },
  });
}
