import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🍜</Text>
        <Text style={styles.title}>Launchpad</Text>
        <Text style={styles.subtitle}>Turn "where do you want to eat" into a 2-minute decision.</Text>

        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('CreateSession')}>
          <Text style={styles.primaryButtonText}>Start a session</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('JoinSession')}>
          <Text style={styles.secondaryButtonText}>Join with a code</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  emoji: { fontSize: 56 },
  title: { fontSize: 32, fontWeight: '800' },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 24 },
  primaryButton: { backgroundColor: '#ff5a5f', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 999, width: '100%' },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  secondaryButton: { paddingVertical: 16, paddingHorizontal: 32, borderRadius: 999, width: '100%' },
  secondaryButtonText: { color: '#333', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
