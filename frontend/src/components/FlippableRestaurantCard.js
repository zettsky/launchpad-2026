import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { API_BASE_URL } from '../services/api';
import { useTheme } from '../context/ThemeContext';

function formatPrice(priceLevel) {
  if (priceLevel == null) return null;
  return '$'.repeat(Math.max(1, priceLevel + 1));
}

// Google-proxied photo paths are relative ("/places/photo?ref=...") and need the API
// host prefixed; Yelp fallback photos are already full public URLs.
function resolvePhotoUri(photo) {
  return photo.startsWith('http') ? photo : `${API_BASE_URL}${photo}`;
}

export default function FlippableRestaurantCard({ restaurant }) {
  const { colors: COLORS } = useTheme();
  const styles = getStyles(COLORS);
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

  const photos = (restaurant.photos || []).map(resolvePhotoUri);
  const mainPhoto = photos[0] || null;
  const priceLabel = formatPrice(restaurant.priceLevel);

  useEffect(() => {
    setImageFailed(false);
  }, [mainPhoto]);

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handleFlip} style={styles.wrap}>
      <Animated.View style={[styles.card, { transform: [{ rotateY: frontInterpolate }] }]}>
        {mainPhoto && !imageFailed ? (
          <Image
            source={{ uri: mainPhoto }}
            style={styles.photo}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Text style={styles.placeholderEmoji}>🍽️</Text>
          </View>
        )}
        <View style={styles.nameBand}>
          <Text style={styles.name} numberOfLines={2}>{restaurant.name}</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.card, styles.back, { transform: [{ rotateY: backInterpolate }] }]}>
        <View style={styles.backLeft}>
          <Text style={styles.backName} numberOfLines={4}>{restaurant.name}</Text>
          <Text style={styles.backRating}>{restaurant.rating ? `${restaurant.rating.toFixed(1)} / 5` : '— / 5'}</Text>
        </View>

        <View style={styles.backMiddle}>
          <Text style={styles.backLabel}>📍 Location:</Text>
          <Text style={styles.backDetail} numberOfLines={2}>{restaurant.nearestMRT || 'MRT unavailable'}</Text>
          <Text style={styles.backDetail}>{restaurant.type || 'Restaurant'}</Text>
          <Text style={styles.backDetail}>{restaurant.cuisine || 'Cuisine unknown'}</Text>
          <Text style={styles.backDetail}>{priceLabel || 'Price unknown'}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.backPhotos}
          contentContainerStyle={styles.backPhotosContent}
        >
          {photos.length > 0 ? (
            photos.map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.thumb} resizeMode="cover" />
            ))
          ) : (
            <View style={[styles.thumb, styles.photoPlaceholder]}>
              <Text style={styles.placeholderEmojiSmall}>🍽️</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </TouchableOpacity>
  );
}

function getStyles(COLORS) {
  return StyleSheet.create({
    wrap: { width: '100%', height: 340, position: 'relative' },
    card: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      borderRadius: 20,
      backgroundColor: COLORS.cardBackground,
      borderWidth: 2,
      borderColor: COLORS.primary,
      overflow: 'hidden',
      backfaceVisibility: 'hidden',
    },
    back: { flexDirection: 'row', padding: 14, gap: 10 },
    photo: { width: '100%', flex: 4 },
    photoPlaceholder: { backgroundColor: COLORS.chipInactive, alignItems: 'center', justifyContent: 'center' },
    placeholderEmoji: { fontSize: 56 },
    placeholderEmojiSmall: { fontSize: 24 },
    nameBand: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 12,
      backgroundColor: COLORS.chipInactive,
    },
    name: { fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
    backLeft: { width: '26%', justifyContent: 'flex-start', gap: 8 },
    backName: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    backRating: { fontSize: 24, fontWeight: '900', color: COLORS.primaryDark },
    backMiddle: { width: '34%', gap: 6, justifyContent: 'flex-start' },
    backLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text },
    backDetail: { fontSize: 13, color: COLORS.textMuted },
    backPhotos: { flex: 1 },
    backPhotosContent: { gap: 8, alignItems: 'center' },
    thumb: { width: 68, height: 100, borderRadius: 12 },
  });
}
