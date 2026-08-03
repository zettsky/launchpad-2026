import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { API_BASE_URL } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const THUMB_WIDTH = 120;
const THUMB_GAP = 10;
const SLIDE_STEP = THUMB_WIDTH + THUMB_GAP;

function formatPrice(priceLevel) {
  if (priceLevel == null) return null;
  return '$'.repeat(Math.max(1, priceLevel + 1));
}

// Google-proxied photo paths are relative ("/places/photo?ref=...") and need the API
// host prefixed; Yelp/website/Wikimedia fallback photos are already full public URLs.
function resolvePhotoUri(photo) {
  return photo.startsWith('http') ? photo : `${API_BASE_URL}${photo}`;
}

export default function FlippableRestaurantCard({ restaurant }) {
  const { colors: COLORS } = useTheme();
  const styles = getStyles(COLORS);
  const [flipped, setFlipped] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  function handleFlip() {
    setFlipped(!flipped);
  }

  // A driven Animated.Value interpolation was previously used here for a smooth flip,
  // but its transform never actually applied on web (confirmed: the rendered rotateY
  // stayed at its starting value regardless of state), which silently made the back
  // face's interactive content (the photo-scroll arrows) unreachable — the front face's
  // hit region never visually rotated out of the way. A plain state-driven rotation has
  // no such gap: the correct face is interactive immediately and every time.
  const frontRotate = flipped ? '180deg' : '0deg';
  const backRotate = flipped ? '360deg' : '180deg';

  const photos = (restaurant.photos || []).map(resolvePhotoUri);
  const mainPhoto = photos[0] || null;
  const priceLabel = formatPrice(restaurant.priceLevel);
  const maxPhotoIndex = Math.max(0, photos.length - 1);

  useEffect(() => {
    setImageFailed(false);
  }, [mainPhoto]);

  useEffect(() => {
    setPhotoIndex(0);
  }, [restaurant.placeId]);

  // Arrow taps must not bubble up to the card's own onPress (which flips it) — RN's
  // native responder system already isolates this, but react-native-web dispatches
  // real DOM clicks that bubble, so it needs stopping explicitly there.
  //
  // The gallery is driven by this index + a CSS translateX rather than a ScrollView's
  // imperative scrollTo ref: on this react-native-web setup, scrollTo calls (both via
  // the RN ref and the raw DOM API) silently no-op, while property-driven layout via
  // transform/state always applies through React's normal render cycle.
  function slidePhotos(direction, e) {
    e?.stopPropagation?.();
    setPhotoIndex((i) => Math.max(0, Math.min(i + direction, maxPhotoIndex)));
  }

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handleFlip} style={styles.wrap}>
      <View
        style={[styles.card, { transform: [{ rotateY: frontRotate }] }, { pointerEvents: flipped ? 'none' : 'auto' }]}
      >
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
      </View>

      <View
        style={[styles.card, styles.back, { transform: [{ rotateY: backRotate }] }, { pointerEvents: flipped ? 'auto' : 'none' }]}
      >
        <View style={styles.backLeft}>
          <Text style={styles.backName} numberOfLines={4}>{restaurant.name}</Text>
          <Text style={styles.backRating}>{restaurant.rating ? `${restaurant.rating.toFixed(1)} / 5` : '— / 5'}</Text>
        </View>

        <View style={styles.backMiddle}>
          <Text style={styles.backRow}>
            <Text style={styles.backLabel}>Location: </Text>
            <Text style={styles.backDetail}>{restaurant.formattedAddress || 'Unavailable'}</Text>
          </Text>
          <Text style={styles.backRow}>
            <Text style={styles.backLabel}>Nearest MRT: </Text>
            <Text style={styles.backDetail}>{restaurant.nearestMRT || 'Unavailable'}</Text>
          </Text>
          <Text style={styles.backRow}>
            <Text style={styles.backLabel}>Cuisine: </Text>
            <Text style={styles.backDetail}>{restaurant.cuisine || 'Unknown'}</Text>
          </Text>
          <Text style={styles.backRow}>
            <Text style={styles.backLabel}>Budget: </Text>
            <Text style={styles.backDetail}>{priceLabel || 'Unknown'}</Text>
          </Text>
        </View>

        <View style={styles.backRight}>
          <Text style={styles.picturesTitle}>Pictures</Text>
          <View style={styles.photoRow}>
            <TouchableOpacity
              style={[styles.arrowButton, photoIndex === 0 && styles.arrowButtonDisabled]}
              disabled={photoIndex === 0}
              onPress={(e) => slidePhotos(-1, e)}
            >
              <Text style={styles.arrowText}>‹</Text>
            </TouchableOpacity>

            <View style={styles.backPhotosViewport}>
              {photos.length > 0 ? (
                <View style={[styles.backPhotosTrack, { transform: [{ translateX: -photoIndex * SLIDE_STEP }] }]}>
                  {photos.map((uri, i) => (
                    <Image key={i} source={{ uri }} style={styles.thumb} resizeMode="cover" />
                  ))}
                </View>
              ) : (
                <View style={[styles.thumb, styles.photoPlaceholder]}>
                  <Text style={styles.placeholderEmojiSmall}>🍽️</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.arrowButton, photoIndex >= maxPhotoIndex && styles.arrowButtonDisabled]}
              disabled={photoIndex >= maxPhotoIndex}
              onPress={(e) => slidePhotos(1, e)}
            >
              <Text style={styles.arrowText}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function getStyles(COLORS) {
  return StyleSheet.create({
    wrap: { width: '100%', height: 400, position: 'relative' },
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
    back: { flexDirection: 'row', padding: 16, gap: 12 },
    photo: { width: '100%', flex: 4 },
    photoPlaceholder: { backgroundColor: COLORS.chipInactive, alignItems: 'center', justifyContent: 'center' },
    placeholderEmoji: { fontSize: 56 },
    placeholderEmojiSmall: { fontSize: 28 },
    nameBand: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 12,
      backgroundColor: COLORS.chipInactive,
    },
    name: { fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
    backLeft: { flex: 2, justifyContent: 'flex-start', gap: 12 },
    backName: { fontSize: 22, fontWeight: '900', color: COLORS.text },
    backRating: { fontSize: 36, fontWeight: '900', color: COLORS.primaryDark },
    backMiddle: { flex: 3, gap: 12, justifyContent: 'flex-start' },
    backRow: { fontSize: 14, lineHeight: 19 },
    backLabel: { fontWeight: '800', color: COLORS.text },
    backDetail: { color: COLORS.textMuted },
    backRight: { flex: 4, gap: 8 },
    picturesTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    photoRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
    arrowButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: COLORS.chipInactive,
      alignItems: 'center',
      justifyContent: 'center',
    },
    arrowButtonDisabled: { opacity: 0.35 },
    arrowText: { fontSize: 20, fontWeight: '900', color: COLORS.primaryDark, lineHeight: 22 },
    backPhotosViewport: { flex: 1, height: '100%', overflow: 'hidden' },
    backPhotosTrack: { flexDirection: 'row', gap: THUMB_GAP, height: '100%' },
    thumb: { width: THUMB_WIDTH, height: 170, borderRadius: 14 },
  });
}
