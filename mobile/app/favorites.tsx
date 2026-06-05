import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Heart, Star } from 'lucide-react-native';
import { PressableScale } from '../components/primitives/PressableScale';
import { useAuth } from '../lib/auth';
import { useFavorites } from '../hooks/useFavorites';

const INK = '#1A1410';
const MUTED = '#7A6F66';
const BRAND = '#FF5722';
const ROSE = '#E11D48';

export default function FavoritesScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { restaurants, loading, toggle } = useFavorites();

  function Header() {
    return (
      <View className="flex-row items-center justify-between pt-3 px-6">
        <PressableScale onPress={() => router.back()}>
          <View className="w-10 h-10 rounded-full items-center justify-center bg-white" style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.08)' }}>
            <ArrowLeft size={18} color={INK} />
          </View>
        </PressableScale>
        <Text className="text-[11px] uppercase font-bold" style={{ letterSpacing: 1.5, color: BRAND }}>Favorites</Text>
        <View style={{ width: 40 }} />
      </View>
    );
  }

  if (!authLoading && !user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
        <Header />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Heart size={30} color={MUTED} />
          <Text style={{ fontWeight: '800', fontSize: 20, color: INK, marginTop: 16 }}>Your favorites</Text>
          <Text style={{ fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20, marginTop: 8 }}>
            Sign in to save restaurants you love.
          </Text>
          <PressableScale onPress={() => router.push('/sign-in')}>
            <View style={{ backgroundColor: BRAND, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 30, marginTop: 24 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Sign in</Text>
            </View>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
      <Header />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text className="mt-6 mb-4 font-display text-[28px]" style={{ fontWeight: '800', letterSpacing: -0.8, color: INK }}>
          Saved restaurants
        </Text>

        {loading ? (
          <View className="py-10 items-center"><ActivityIndicator color={BRAND} /></View>
        ) : restaurants.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 50 }}>
            <Heart size={28} color={MUTED} />
            <Text style={{ fontWeight: '700', fontSize: 16, color: INK, marginTop: 14 }}>No favorites yet</Text>
            <Text style={{ fontSize: 13, color: MUTED, marginTop: 4, textAlign: 'center' }}>
              Tap the heart on any restaurant to save it here.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {restaurants.map((r) => (
              <View key={r.id} className="flex-row items-center bg-white rounded-2xl p-3.5" style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.07)' }}>
                <PressableScale onPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: r.id } })}>
                  <View className="flex-row items-center flex-1">
                    <View className="w-12 h-12 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(255,87,34,0.10)' }}>
                      <Text style={{ fontSize: 24 }}>{r.emoji ?? '🍽️'}</Text>
                    </View>
                    <View className="ml-3" style={{ maxWidth: 180 }}>
                      <Text className="text-[15px] font-bold" style={{ color: INK }} numberOfLines={1}>{r.name}</Text>
                      {r.cuisine ? <Text className="text-[12px] mt-0.5" style={{ color: MUTED }} numberOfLines={1}>{r.cuisine}</Text> : null}
                    </View>
                  </View>
                </PressableScale>
                <View className="flex-1" />
                {r.rating != null && (
                  <View className="flex-row items-center mr-3" style={{ gap: 3 }}>
                    <Star size={13} color={BRAND} fill={BRAND} />
                    <Text className="text-[13px] font-bold" style={{ color: INK }}>{r.rating}</Text>
                  </View>
                )}
                <PressableScale onPress={() => toggle(r.id)}>
                  <Heart size={20} color={ROSE} fill={ROSE} />
                </PressableScale>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
