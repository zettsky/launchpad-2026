import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { api } from '../services/api';
import { useSession } from '../context/SessionContext';
import SwipeDeck from '../components/SwipeDeck';

export default function SwipeScreen({ navigation }) {
  const { code, memberId, snapshot } = useSession();

  useEffect(() => {
    if (snapshot?.state === 'decided') {
      navigation.replace('Decision');
    }
  }, [snapshot?.state, navigation]);

  function handleSwipe(placeId, vote) {
    api.swipe(code, memberId, placeId, vote).catch(() => {});
  }

  if (!snapshot?.candidates) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Swipe right on places you'd eat at</Text>
      <View style={styles.deckWrap}>
        <SwipeDeck candidates={snapshot.candidates} onSwipe={handleSwipe} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '600', color: '#333', marginTop: 16, marginBottom: 8, textAlign: 'center', paddingHorizontal: 24 },
  deckWrap: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
});
