import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

function formatDistance(distanceM) {
  if (distanceM == null) return '';

  return distanceM < 1000
    ? `${Math.round(distanceM)} m away`
    : `${(distanceM / 1000).toFixed(1)} km away`;
}

function formatPrice(priceLevel) {
  if (priceLevel == null) return '';

  return '$'.repeat(Math.max(1, priceLevel + 1));
}

export default function RestaurantCard({ restaurant }) {
  const { colors: COLORS } = useTheme();
  const styles = getStyles(COLORS);
  const [imageUrl, setImageUrl] = useState(null);
  const [loadingImage, setLoadingImage] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchRestaurantImage() {
      setLoadingImage(true);
      setImageFailed(false);
      setImageUrl(null);

      try {
        const data = await api.getRestaurantImage(
          restaurant.name,
          'Singapore'
        );

        if (!cancelled) {
          setImageUrl(data?.imageUrl || null);
        }
      } catch (error) {
        console.error(
          `Failed to fetch image for ${restaurant.name}:`,
          error
        );

        if (!cancelled) {
          setImageFailed(true);
        }
      } finally {
        if (!cancelled) {
          setLoadingImage(false);
        }
      }
    }

    fetchRestaurantImage();

    return () => {
      cancelled = true;
    };
  }, [restaurant.name]);

  return (
    <View style={styles.card}>
      {loadingImage ? (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : imageUrl && !imageFailed ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.photo}
          resizeMode="cover"
          onError={() => {
            console.log('Failed to display:', imageUrl);
            setImageFailed(true);
          }}
        />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <Text style={styles.placeholderEmoji}>🍽️</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {restaurant.name}
        </Text>

        <Text style={styles.meta}>
          {restaurant.cuisineTag?.replace(/_/g, ' ')} ·{' '}
          {formatPrice(restaurant.priceLevel)}
        </Text>

        <Text style={styles.meta}>
          {restaurant.rating
            ? `★ ${restaurant.rating}`
            : 'No rating yet'}{' '}
          · {formatDistance(restaurant.distanceM)}
        </Text>
      </View>
    </View>
  );
}

function getStyles(COLORS) {
  return StyleSheet.create({
    card: {
      width: '100%',
      borderRadius: 16,
      backgroundColor: COLORS.cardBackground,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },

    photo: {
      width: '100%',
      height: 260,
    },

    photoPlaceholder: {
      backgroundColor: COLORS.chipInactive,
      alignItems: 'center',
      justifyContent: 'center',
    },

    placeholderEmoji: {
      fontSize: 64,
    },

    info: {
      padding: 16,
      gap: 4,
    },

    name: {
      fontSize: 20,
      fontWeight: '700',
      color: COLORS.text,
    },

    meta: {
      fontSize: 14,
      color: COLORS.textMuted,
    },
  });
}