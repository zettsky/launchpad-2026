import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import { API_BASE_URL } from '../services/api';
import { useTheme } from '../context/ThemeContext';

function formatPrice(priceLevel) {
  if (priceLevel == null) return 'Unknown';
  return '$'.repeat(Math.max(1, priceLevel + 1));
}

// Google photo proxy URLs are relative.
// Yelp photos are already full URLs.
function resolvePhotoUri(photo) {
  if (!photo) return null;
  return photo.startsWith('http')
    ? photo
    : `${API_BASE_URL}${photo}`;
}

function CarouselImage({ uri, style, styles }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (!uri || failed) {
    return (
      <View style={[style, styles.photoPlaceholder]}>
        <Text style={styles.placeholderEmojiSmall}>
          🍽️
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

export default function FlippableRestaurantCard({
  restaurant,
}) {
  const { colors: COLORS } = useTheme();
  const styles = getStyles(COLORS);

  const [flipped, setFlipped] = useState(false);

  const [imageFailed, setImageFailed] =
    useState(false);

  const [photoIndex, setPhotoIndex] =
    useState(0);

  const photos = (restaurant.photos || [])
    .map(resolvePhotoUri)
    .filter(Boolean);

  const mainPhoto = photos[0];

  const maxPhotoIndex = Math.max(
    0,
    photos.length - 1
  );

  useEffect(() => {
    setImageFailed(false);
  }, [mainPhoto]);

  useEffect(() => {
    setPhotoIndex(0);
  }, [restaurant.placeId]);

  function nextPhoto(e) {
    e?.stopPropagation?.();

    setPhotoIndex((i) =>
      Math.min(i + 1, maxPhotoIndex)
    );
  }

  function previousPhoto(e) {
    e?.stopPropagation?.();

    setPhotoIndex((i) =>
      Math.max(i - 1, 0)
    );
  }

  function flipCard() {
    setFlipped((f) => !f);
  }

  const priceLabel = formatPrice(
    restaurant.priceLevel
  );

  return (
        <TouchableOpacity
      activeOpacity={0.95}
      style={styles.wrapper}
      onPress={flipCard}
    >

      {/* ================= FRONT ================= */}

      {!flipped && (
        <View style={styles.card}>

          {mainPhoto && !imageFailed ? (
            <Image
              source={{ uri: mainPhoto }}
              style={styles.heroImage}
              resizeMode="cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <View
              style={[
                styles.heroImage,
                styles.photoPlaceholder,
              ]}
            >
              <Text style={styles.placeholderEmoji}>
                🍽️
              </Text>
            </View>
          )}

          <View style={styles.bottomBar}>
            <Text
              style={styles.restaurantName}
              numberOfLines={2}
            >
              {restaurant.name}
            </Text>
          </View>

        </View>
      )}

      {/* ================= BACK ================= */}

      {flipped && (
        <View style={styles.card}>

          <View style={styles.backContainer}>

            {/* LEFT COLUMN */}

            <View style={styles.leftColumn}>

              <Text
                style={styles.backTitle}
                numberOfLines={4}
              >
                {restaurant.name}
              </Text>

              <View style={styles.ratingContainer}>
                <Text style={styles.rating}>
                  {restaurant.rating
                    ? `${restaurant.rating.toFixed(1)} / 5`
                    : '-- / 5'}
                </Text>
              </View>

            </View>

            {/* MIDDLE COLUMN */}

            <View style={styles.middleColumn}>

              <Text style={styles.infoRow}>
                <Text style={styles.label}>
                  📍 Location:
                </Text>
                {' '}
                <Text style={styles.value}>
                  {restaurant.formattedAddress ||
                    'Unavailable'}
                </Text>
              </Text>

              <Text style={styles.infoRow}>
                <Text style={styles.label}>
                  Nearest MRT:
                </Text>
                {' '}
                <Text style={styles.value}>
                  {restaurant.nearestMRT ||
                    'Unavailable'}
                </Text>
              </Text>

              <Text style={styles.infoRow}>
                <Text style={styles.label}>
                  Type:
                </Text>
                {' '}
                <Text style={styles.value}>
                  {restaurant.type ||
                    'Restaurant'}
                </Text>
              </Text>

              <Text style={styles.infoRow}>
                <Text style={styles.label}>
                  Cuisine:
                </Text>
                {' '}
                <Text style={styles.value}>
                  {restaurant.cuisine ||
                    'Unknown'}
                </Text>
              </Text>

              <Text style={styles.infoRow}>
                <Text style={styles.label}>
                  Budget:
                </Text>
                {' '}
                <Text style={styles.value}>
                  {priceLabel}
                </Text>
              </Text>

            </View>

            {/* RIGHT COLUMN */}

            <View style={styles.rightColumn}>

              <Text style={styles.galleryTitle}>
                Food through customers' eyes
              </Text>

              {photos.length > 0 ? (

                <View style={styles.gallery}>

                  {photoIndex > 0 ? (
                    <CarouselImage
                      uri={photos[photoIndex - 1]}
                      style={styles.sideImage}
                      styles={styles}
                    />
                  ) : (
                    <View style={styles.sideSpacer} />
                  )}

                  <CarouselImage
                    uri={photos[photoIndex]}
                    style={styles.mainImage}
                    styles={styles}
                  />

                  {photoIndex < maxPhotoIndex ? (
                    <CarouselImage
                      uri={photos[photoIndex + 1]}
                      style={styles.sideImage}
                      styles={styles}
                    />
                  ) : (
                    <View style={styles.sideSpacer} />
                  )}

                </View>

              ) : (

                <View
                  style={[
                    styles.mainImage,
                    styles.photoPlaceholder,
                  ]}
                >
                  <Text style={styles.placeholderEmojiSmall}>
                    🍽️
                  </Text>
                </View>

              )}

              <View style={styles.arrowRow}>

                <TouchableOpacity
                  style={[
                    styles.arrowButton,
                    photoIndex === 0 &&
                      styles.arrowDisabled,
                  ]}
                  disabled={photoIndex === 0}
                  onPress={previousPhoto}
                >
                  <Text style={styles.arrowText}>
                    ‹
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.arrowButton,
                    photoIndex >= maxPhotoIndex &&
                      styles.arrowDisabled,
                  ]}
                  disabled={
                    photoIndex >= maxPhotoIndex
                  }
                  onPress={nextPhoto}
                >
                  <Text style={styles.arrowText}>
                    ›
                  </Text>
                </TouchableOpacity>

              </View>

            </View>

          </View>

        </View>
      )}

    </TouchableOpacity>
  );
}

function getStyles(COLORS) {
  return StyleSheet.create({
        wrapper: {
      width: '100%',
      height: 430,
      marginVertical: 10,
    },

    card: {
      flex: 1,
      backgroundColor: COLORS.cardBackground,
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: COLORS.primary,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      elevation: 7,
    },

    /* ---------- FRONT ---------- */

    heroImage: {
      flex: 1,
      width: '100%',
    },

    bottomBar: {
      height: 88,
      backgroundColor: COLORS.primary,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 18,
    },

    restaurantName: {
      fontSize: 24,
      fontWeight: '900',
      color: '#fff',
      textAlign: 'center',
    },

    /* ---------- BACK ---------- */

    backContainer: {
      flex: 1,
      flexDirection: 'row',
      padding: 18,
    },

    leftColumn: {
      flex: 2,
      paddingRight: 12,
    },

    middleColumn: {
      flex: 3,
      justifyContent: 'center',
      paddingHorizontal: 8,
    },

    rightColumn: {
      flex: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },

    backTitle: {
      fontSize: 30,
      fontWeight: '900',
      color: COLORS.text,
      lineHeight: 35,
      marginBottom: 22,
    },

    ratingContainer: {
      flex: 1,
      justifyContent: 'center',
    },

    rating: {
      fontSize: 56,
      fontWeight: '900',
      color: COLORS.primaryDark,
    },

    infoRow: {
      fontSize: 15,
      lineHeight: 23,
      marginBottom: 14,
    },

    label: {
      fontWeight: '800',
      color: COLORS.text,
    },

    value: {
      color: COLORS.textMuted,
    },

    galleryTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: COLORS.text,
      textAlign: 'center',
      marginBottom: 14,
    },

    gallery: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },

    mainImage: {
      width: 145,
      height: 210,
      borderRadius: 18,
      marginHorizontal: 8,
    },

    sideImage: {
      width: 55,
      height: 155,
      borderRadius: 12,
      opacity: 0.35,
    },

        sideSpacer: {
      width: 55,
      height: 155,
    },

    arrowRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 18,
      gap: 22,
    },

    arrowButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: COLORS.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 4,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      elevation: 2,
    },

    arrowDisabled: {
      opacity: 0.35,
    },

    arrowText: {
      color: '#fff',
      fontSize: 24,
      fontWeight: '900',
      lineHeight: 26,
      marginTop: -2,
    },

    photoPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#ECECEC',
      borderRadius: 18,
    },

    placeholderEmoji: {
      fontSize: 72,
    },

    placeholderEmojiSmall: {
      fontSize: 34,
    },
  });
}
