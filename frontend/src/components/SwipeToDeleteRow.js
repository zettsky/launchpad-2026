import React, { useRef } from 'react';
import { View, Text, Animated, PanResponder, TouchableOpacity, StyleSheet } from 'react-native';

const DELETE_WIDTH = 80;

// Wraps a row so dragging it left reveals a red delete action behind it, matching the
// common iOS/Android "swipe to delete" list pattern. Built with PanResponder + Animated
// (same approach as SwipeDeck.js) rather than a new gesture library.
export default function SwipeToDeleteRow({ children, onDelete }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const currentOffset = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        const next = Math.min(0, Math.max(-DELETE_WIDTH, currentOffset.current + gesture.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, gesture) => {
        const next = currentOffset.current + gesture.dx;
        const shouldOpen = next < -DELETE_WIDTH / 2;
        const target = shouldOpen ? -DELETE_WIDTH : 0;
        currentOffset.current = target;
        Animated.spring(translateX, { toValue: target, useNativeDriver: false }).start();
      },
    })
  ).current;

  function handleDelete() {
    currentOffset.current = 0;
    translateX.setValue(0);
    onDelete();
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.deleteBackground}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
      <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX }] }}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', position: 'relative' },
  deleteBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: DELETE_WIDTH,
    backgroundColor: '#e53935',
    borderRadius: 20,
    overflow: 'hidden',
  },
  deleteButton: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: '#fff', fontWeight: '700' },
});
