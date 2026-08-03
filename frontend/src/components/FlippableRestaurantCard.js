import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { API_BASE_URL } from '../services/api';
import { useTheme } from '../context/ThemeContext';

function formatPrice(priceLevel) {
  if (priceLevel == null) return null;
  return '$'.repeat(Math.max(1, priceLevel + 1));
}

// Google-proxied photo paths are relative ("/places/photo?ref=...") and need the API
// host prefixed; Yelp/website/Wikimedia fallback photos are already full public URLs.
function resolvePhotoUri(photo) {
  return photo.startsWith('http') ? photo : `${API_BASE_URL}${photo}`;
}

// Some photo URLs (e.g. a restaurant's own site blocking hotlinked requests) fail to
// load in-browser despite being reachable directly — the front face already falls back
// to a placeholder for this, and each carousel slot needs the same per-image handling,
// since one blocked URL shouldn't leave that slot blank.
function CarouselImage({ uri, style, styles }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (failed) {
    return (
      <View style={[style, styles.photoPlaceholder]}>
        <Text style={styles.placeholderEmojiSmall}>🍽️</Text>
      </View>
    );
  }
  return <Image source={{ uri }} style={style} resizeMode="cover" onError={() => setFailed(true)} />;
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
  // The carousel always renders photos[index-1/index/index+1] directly from state
  // rather than using a ScrollView's imperative scrollTo ref: on this react-native-web
  // setup, scrollTo calls (both via the RN ref and the raw DOM API) silently no-op,
  // while property-driven layout via plain render always applies correctly.
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
          <View style={styles.ratingWrap}>
            <Text style={styles.backRating}>{restaurant.rating ? `${restaurant.rating.toFixed(1)} / 5` : '— / 5'}</Text>
          </View>
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
            <Text style={styles.backLabel}>Type: </Text>
            <Text style={styles.backDetail}>{restaurant.type || 'Unknown'}</Text>
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
          <Text style={styles.picturesTitle}>Food through customers' eyes</Text>

          {photos.length > 0 ? (
            <View style={styles.carousel}>
              {photoIndex > 0 ? (
                <CarouselImage uri={photos[photoIndex - 1]} style={styles.thumbSide} styles={styles} />
              ) : (
                <View style={styles.thumbSideSlot} />
              )}

              <CarouselImage uri={photos[photoIndex]} style={styles.thumbMain} styles={styles} />

              {photoIndex < maxPhotoIndex ? (
                <CarouselImage uri={photos[photoIndex + 1]} style={styles.thumbSide} styles={styles} />
              ) : (
                <View style={styles.thumbSideSlot} />
              )}
            </View>
          ) : (
            <View style={[styles.thumbMain, styles.photoPlaceholder]}>
              <Text style={styles.placeholderEmojiSmall}>🍽️</Text>
            </View>
          )}

          <View style={styles.arrowRow}>
            <TouchableOpacity
              style={[styles.arrowButton, photoIndex === 0 && styles.arrowButtonDisabled]}
              disabled={photoIndex === 0}
              onPress={(e) => slidePhotos(-1, e)}
            >
              <Text style={styles.arrowText}>‹</Text>
            </TouchableOpacity>
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
    // Name stays pinned at the top per the design; everything else in the back face
    // (rating, the middle details, and the whole picture column) is vertically
    // centered in the remaining space.
    backLeft: { flex: 2 },
    backName: { fontSize: 26, fontWeight: '900', color: COLORS.text },
    ratingWrap: { flex: 1, justifyContent: 'center' },
    backRating: { fontSize: 52, fontWeight: '900', color: COLORS.primaryDark },
    backMiddle: { flex: 3, gap: 14, justifyContent: 'center' },
    backRow: { fontSize: 14, lineHeight: 19 },
    backLabel: { fontWeight: '800', color: COLORS.text },
    backDetail: { color: COLORS.textMuted },
    backRight: { flex: 4, gap: 10, justifyContent: 'center', alignItems: 'center' },
    picturesTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
    carousel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    thumbMain: { width: 130, height: 190, borderRadius: 16 },
    // The two neighbouring photos "condense" (narrower) and "lighten" (reduced
    // opacity) to visually recede next to the focused main photo.
    thumbSide: { width: 55, height: 150, borderRadius: 12, opacity: 0.4 },
    thumbSideSlot: { width: 55, height: 150 },
    arrowRow: { flexDirection: 'row', gap: 20 },
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
  });
}
