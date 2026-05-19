import { MotiView } from 'moti';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, MapPin, Receipt } from 'lucide-react-native';
import { CategoryGrid } from '../components/CategoryGrid';
import { useCategories } from '../hooks/useCategories';

export default function Home() {
  const router = useRouter();
  const { categories } = useCategories();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
      <View className="flex-1 px-6">
        {/* Top bar */}
        <MotiView
          from={{ opacity: 0, translateY: -8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 320 }}
          className="flex-row items-center justify-between pt-3"
        >
          <View className="flex-row items-center">
            <View
              className="w-9 h-9 rounded-xl items-center justify-center"
              style={{
                backgroundColor: '#FF5722',
                shadowColor: '#FF5722',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <MapPin size={16} color="#fff" strokeWidth={2.5} />
            </View>
            <View className="ml-3">
              <Text className="text-[10px] uppercase font-bold" style={{ letterSpacing: 1.2, color: '#7A6F66' }}>
                Deliver to
              </Text>
              <Text className="text-[14px] font-bold mt-0.5" style={{ color: '#1A1410' }}>
                AUI · Building 16
              </Text>
            </View>
          </View>
          <View className="flex-row items-center">
            <Pressable
              onPress={() => router.push('/orders')}
              accessibilityRole="button"
              accessibilityLabel="Orders"
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center bg-white mr-2"
                style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.08)' }}
              >
                <Receipt size={16} color="#1A1410" />
              </View>
            </Pressable>
            <View
              className="w-10 h-10 rounded-full items-center justify-center bg-white"
              style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.08)' }}
            >
              <Bell size={16} color="#1A1410" />
            </View>
          </View>
        </MotiView>

        {/* Heading */}
        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 380, delay: 120 }}
          className="mt-7 mb-7"
        >
          <Text className="text-[12px] uppercase font-bold mb-2" style={{ letterSpacing: 1.6, color: '#FF5722' }}>
            AtlaasGo · Ifrane
          </Text>
          <Text
            className="font-display text-[34px]"
            style={{ fontWeight: '800', lineHeight: 36, letterSpacing: -1.2, color: '#1A1410' }}
          >
            What are you{'\n'}
            <Text style={{ color: '#FF5722' }}>craving</Text> today?
          </Text>
          <Text className="mt-3 text-[14px]" style={{ color: '#7A6F66', lineHeight: 20 }}>
            One ecosystem. Three ways in.
          </Text>
        </MotiView>

        <CategoryGrid
          categories={categories}
          onSelect={(c) => router.push({ pathname: '/checkout', params: { category: c.id } })}
        />
      </View>
    </SafeAreaView>
  );
}
