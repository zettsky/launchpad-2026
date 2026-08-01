import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { API_BASE_URL } from '../services/api';

function formatPrice(priceLevel) {
  if (priceLevel == null) return '';
  return '$'.repeat(Math.max(1, priceLevel + 1));
}

export default function FlippableRestaurantCard({ restaurant }) {
  const [flipped, setFlipped] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  function handleFlip() {
    Animated.timing(anim, {
      toValue: flipped ? 0 : 180,
      duration: 400,
      useNativeDriver: false,
    }).start();
    setFlipped(!flipped);
  }

  const frontInterpolate = anim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const backInterpolate = anim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });

  const imageUri = restaurant.photoUrl ? `${API_BASE_URL}${restaurant.photoUrl}` : null;
  const location = restaurant.formattedAddress || (restaurant.lat != null ? `${restaurant.lat.toFixed(5)}, ${restaurant.lng.toFixed(5)}` : 'Location unavailable');
  const cuisineLabel = restaurant.cuisineTag ? restaurant.cuisineTag.replace(/_/g, ' ') : 'Unknown cuisine';

  useEffect(() => {
    setImageFailed(false);
  }, [imageUri]);

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handleFlip} style={styles.wrap}>
      <Animated.View style={[styles.card, { transform: [{ rotateY: frontInterpolate }] }]}>
        {imageUri && !imageFailed ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.photo}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Text style={styles.placeholderEmoji}>🍽️</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>{restaurant.name}</Text>
          <Text style={styles.hint}>Tap to flip</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.card, styles.back, { transform: [{ rotateY: backInterpolate }] }]}>
        <Text style={styles.backTitle}>{restaurant.name}</Text>
        <Text style={styles.backLine}>📍 {location}</Text>
        {restaurant.nearestMRT && (
  <Text style={styles.backLine}>
    🚆 Nearest MRT: {restaurant.nearestMRT}
  </Text>
)}

        <Text style={styles.backLine}>🍽️ {cuisineLabel}</Text>
        <Text style={styles.backLine}>💰 {formatPrice(restaurant.priceLevel) || 'Price unknown'}</Text>
        <Text style={styles.backLine}>{restaurant.rating ? `★ ${restaurant.rating}` : 'No rating yet'}</Text>
        <Text style={styles.hint}>Tap to flip back</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', height: 340, position: 'relative' },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  back: { padding: 20 },
  photo: { width: '100%', height: 220 },
  photoPlaceholder: { backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  placeholderEmoji: { fontSize: 64 },
  info: { padding: 16, gap: 4 },
  name: { fontSize: 20, fontWeight: '700' },
  hint: { fontSize: 12, color: '#999', marginTop: 8 },
  backTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  backLine: { fontSize: 14, color: '#444', marginBottom: 8 },
});
