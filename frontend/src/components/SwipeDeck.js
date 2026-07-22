import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, PanResponder, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import RestaurantCard from './RestaurantCard';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 120;

export default function SwipeDeck({ candidates, onSwipe }) {
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const position = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  function forceSwipe(vote) {
    // Guard against TouchableOpacity's double-onPress quirk on web; reset on a timer rather
    // than an animation callback, since recording the vote must not depend on requestAnimationFrame
    // actually running (it can be paused for backgrounded tabs, reduced-motion, etc).
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    const candidate = candidates[indexRef.current];

    Animated.timing(position, {
      toValue: { x: vote === 'yes' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start();

    setIndex((i) => i + 1);
    if (candidate) onSwipe(candidate.placeId, vote);

    setTimeout(() => {
      position.setValue({ x: 0, y: 0 });
      isAnimatingRef.current = false;
    }, 260);
  }

  function resetPosition() {
    Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 5,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          forceSwipe('yes');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          forceSwipe('no');
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  if (index >= candidates.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>You've swiped through everyone — waiting on the rest of the group…</Text>
      </View>
    );
  }

  const current = candidates[index];
  const next = candidates[index + 1];

  return (
    <View style={styles.container}>
      <View style={styles.cardStack}>
        {next && (
          <View style={[styles.cardWrap, styles.nextCard]}>
            <RestaurantCard restaurant={next} />
          </View>
        )}
        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.cardWrap, { transform: [...position.getTranslateTransform(), { rotate }] }]}
        >
          <RestaurantCard restaurant={current} />
        </Animated.View>
      </View>

      <View style={styles.buttonsRow}>
        <TouchableOpacity style={[styles.actionButton, styles.noButton]} onPress={() => forceSwipe('no')}>
          <Text style={styles.actionText}>✕ Pass</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.yesButton]} onPress={() => forceSwipe('yes')}>
          <Text style={[styles.actionText, styles.yesText]}>♥ Yes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: '100%' },
  cardStack: { width: '100%', maxWidth: 360, height: 440 },
  cardWrap: { position: 'absolute', width: '100%' },
  nextCard: { top: 8, transform: [{ scale: 0.96 }], opacity: 0.7 },
  buttonsRow: { flexDirection: 'row', gap: 20, marginTop: 24 },
  actionButton: { paddingVertical: 14, paddingHorizontal: 28, borderRadius: 999 },
  noButton: { backgroundColor: '#f1f1f1' },
  yesButton: { backgroundColor: '#ff5a5f' },
  actionText: { fontSize: 16, fontWeight: '700', color: '#222' },
  yesText: { color: '#fff' },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 16, textAlign: 'center', color: '#555' },
});
