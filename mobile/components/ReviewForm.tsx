import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Check, Star } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { PressableScale } from './primitives/PressableScale';
import { useAuth } from '../lib/auth';
import { useReview } from '../hooks/useReview';

/**
 * Post-delivery review card — mobile port of web src/components/ReviewForm.tsx.
 * Restaurant stars (required) + rider stars (optional) + comment. UPSERTs into
 * `reviews` so the customer can update their review anytime; an existing
 * review prefills the form.
 */

const INK = '#1A1410';
const MUTED = '#7A6F66';
const BRAND = '#FF5722';
const GOLD = '#F59E0B';
const LINE = 'rgba(26,20,16,0.08)';

function Stars({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange: (n: number) => void;
  size?: number;
}) {
  return (
    <View className="flex-row" style={{ gap: 8 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={6}>
          <Star
            size={size}
            color={n <= value ? GOLD : 'rgba(26,20,16,0.18)'}
            fill={n <= value ? GOLD : 'transparent'}
          />
        </Pressable>
      ))}
    </View>
  );
}

export function ReviewForm({
  orderId,
  restaurantId,
}: {
  orderId: string;
  restaurantId: string | null;
}) {
  const { t: tr } = useTranslation();
  const { user } = useAuth();
  const { review, loading, submitting, error, submit } = useReview(orderId);
  const [restaurantRating, setRestaurantRating] = useState(0);
  const [riderRating, setRiderRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saved, setSaved] = useState(false);

  // Prefill once the existing review loads.
  useEffect(() => {
    if (!review) return;
    setRestaurantRating(review.rating_restaurant ?? 0);
    setRiderRating(review.rating_rider ?? 0);
    setComment(review.comment ?? '');
  }, [review?.id]);

  if (!user) return null;

  if (loading) {
    return (
      <View className="rounded-3xl bg-white p-5 items-center" style={{ borderWidth: 1, borderColor: LINE }}>
        <ActivityIndicator color={BRAND} />
      </View>
    );
  }

  async function onSubmit() {
    if (restaurantRating === 0) return;
    setSaved(false);
    const ok = await submit({
      restaurantId,
      ratingRestaurant: restaurantRating,
      ratingRider: riderRating || undefined,
      comment: comment.trim() || undefined,
    });
    if (ok) setSaved(true);
  }

  const hasExisting = !!review;

  return (
    <View className="rounded-3xl bg-white p-5" style={{ borderWidth: 1, borderColor: LINE }}>
      <Text className="text-[10px] uppercase font-bold" style={{ letterSpacing: 1.2, color: BRAND }}>
        {tr('review.eyebrow')}
      </Text>
      <Text className="mt-1 text-[19px]" style={{ fontWeight: '900', color: INK, letterSpacing: -0.4 }}>
        {tr('review.title')}
      </Text>

      {(hasExisting || saved) && (
        <View
          className="flex-row items-center mt-3 rounded-xl px-3 py-2.5"
          style={{ backgroundColor: 'rgba(5,150,105,0.08)' }}
        >
          <Check size={14} color="#059669" strokeWidth={3} />
          <Text className="ml-2 flex-1 text-[12px]" style={{ color: '#059669', fontWeight: '600' }}>
            {tr('review.savedNote')}
          </Text>
        </View>
      )}

      <View className="mt-4">
        <Text className="text-[12px] font-bold mb-2" style={{ color: MUTED }}>
          {tr('review.foodLabel')}
        </Text>
        <Stars value={restaurantRating} onChange={setRestaurantRating} />
      </View>

      <View className="mt-4">
        <Text className="text-[12px] font-bold mb-2" style={{ color: MUTED }}>
          {tr('review.riderLabel')}
        </Text>
        <Stars value={riderRating} onChange={setRiderRating} size={22} />
      </View>

      <Text className="text-[12px] font-bold mt-4 mb-2" style={{ color: MUTED }}>
        {tr('review.commentLabel')}
      </Text>
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder={tr('review.commentPlaceholder')}
        placeholderTextColor="#A89E94"
        multiline
        numberOfLines={3}
        style={{
          backgroundColor: '#FBF7F2',
          borderWidth: 1,
          borderColor: LINE,
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 12,
          minHeight: 76,
          fontSize: 14,
          color: INK,
          textAlignVertical: 'top',
        }}
      />

      {error ? (
        <Text className="mt-2 text-[12px]" style={{ color: '#E11D48' }}>{error}</Text>
      ) : null}

      <PressableScale onPress={onSubmit} disabled={restaurantRating === 0 || submitting}>
        <View
          className="rounded-2xl py-3.5 items-center mt-4"
          style={{ backgroundColor: BRAND, opacity: restaurantRating === 0 || submitting ? 0.5 : 1 }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
              {hasExisting ? tr('review.updateButton') : tr('review.submitButton')}
            </Text>
          )}
        </View>
      </PressableScale>
    </View>
  );
}
