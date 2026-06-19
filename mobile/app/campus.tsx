import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  GraduationCap,
  MapPin,
  Search,
  X,
  Zap,
} from 'lucide-react-native';
import { PressableScale } from '../components/primitives/PressableScale';
import { useAuth } from '../lib/auth';
import { useCreateOrder } from '../hooks/useCreateOrder';

const INK = '#1A1410';
const MUTED = '#7A6F66';
const BRAND = '#FF5722';

// AUI building list — copied from the web Campus page (src/pages/Campus.tsx).
const AUI_BUILDINGS: Record<string, string[]> = {
  'Residence Halls': [
    "Building 1 — Men's Dorm",
    "Building 2 — Men's Dorm",
    "Building 3 — Men's Dorm",
    "Building 4 — Men's Dorm",
    "Building 5 — Men's Dorm",
    "Building 6 — Men's Dorm",
    "Building 7 — Men's Dorm",
    "Building 8 — Men's Dorm",
    "Building 9 — Women's Dorm",
    "Building 10 — Women's Dorm",
    "Building 11 — Women's Dorm",
    "Building 12 — Women's Dorm",
    "Building 13 — Women's Dorm",
    "Building 14 — Women's Dorm",
    "Building 15 — Women's Dorm",
    'Building 16 — Mixed Dorm',
    'Building 17 — Graduate Housing',
    'Building 18 — Graduate Housing',
    'Building 19 — Faculty Housing',
    'Building 20 — Faculty Housing',
    'Atlas Residence',
    'International Student House',
  ],
  'Academic Buildings': [
    'Main Academic Building (MAB)',
    'Engineering & Sciences (ESB)',
    'School of Business (SBA)',
    'Library — Old Wing',
    'Library — New Wing',
    'Student Center',
    'Amphitheater',
  ],
  Facilities: [
    'AUI Cafeteria (Main)',
    'Sports Complex',
    'Health Center',
    'Admin Building',
    'Gate / Security Post',
    'Parking Area A',
    'Parking Area B',
  ],
};

const QUICK_PICKS = [
  'Café Hassan tagine',
  'Boulangerie croissant',
  'Snack Atlas brochettes',
  'Bab Mansour café',
  'Cold medicine',
  'Groceries from souk',
];

// Same pricing as the web Campus page: flat 15 dh item + 20 dh courier fee.
const FIXED_PRICE_DH = 15;
const DELIVERY_FEE_DH = 20;
const AUI_COORDS = { lat: 33.535, lng: -5.1106 }; // AUI default

export default function CampusScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { create, submitting, error } = useCreateOrder();

  const [what, setWhat] = useState('');
  const [building, setBuilding] = useState('');
  const [room, setRoom] = useState('');
  const [notes, setNotes] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  const canSubmit = what.trim().length >= 3 && !!building && !submitting;

  async function handleSubmit() {
    if (!canSubmit || !user) return;
    // Built exactly like the web Campus page (src/pages/Campus.tsx): one
    // flat-priced "campus drop" line item, building+room in the landmark,
    // 20 dh courier fee, is_campus flag on the row.
    const orderId = await create({
      customerId: user.id,
      coords: AUI_COORDS,
      landmark: `${building}${room.trim() ? `, Room/Suite ${room.trim()}` : ''}`,
      items: [
        {
          id: `campus-${Date.now()}`,
          restaurantId: 'aui-cafeteria',
          restaurantName: 'AUIER Campus Drop',
          name: what.trim(),
          priceDh: FIXED_PRICE_DH,
          qty: 1,
        },
      ],
      subtotalDh: FIXED_PRICE_DH,
      deliveryFeeDh: DELIVERY_FEE_DH,
      serviceFeeDh: 0,
      totalDh: FIXED_PRICE_DH + DELIVERY_FEE_DH,
      deliveryNotes: notes.trim() || undefined,
      isCampus: true,
    });
    if (orderId) {
      setSubmitted(true);
      redirectTimer.current = setTimeout(() => router.replace(`/order/${orderId}`), 1200);
    }
  }

  function Header() {
    return (
      <View className="flex-row items-center justify-between pt-3 px-6">
        <PressableScale onPress={() => router.back()}>
          <View className="w-10 h-10 rounded-full items-center justify-center bg-white" style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.08)' }}>
            <ArrowLeft size={18} color={INK} />
          </View>
        </PressableScale>
        <Text className="text-[11px] uppercase font-bold" style={{ letterSpacing: 1.5, color: BRAND }}>Campus</Text>
        <View style={{ width: 40 }} />
      </View>
    );
  }

  if (authLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
        <Header />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={BRAND} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
        <Header />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <GraduationCap size={30} color={MUTED} />
          <Text style={{ fontWeight: '800', fontSize: 20, color: INK, marginTop: 16 }}>AUI campus courier</Text>
          <Text style={{ fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20, marginTop: 8 }}>
            Sign in to get anything in Ifrane delivered to your building.
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

  if (submitted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
        <Header />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View className="w-16 h-16 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(5,150,105,0.12)' }}>
            <Check size={28} color="#059669" strokeWidth={3} />
          </View>
          <Text style={{ fontWeight: '900', fontSize: 24, color: INK, marginTop: 18, letterSpacing: -0.6 }}>On its way</Text>
          <Text style={{ fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20, marginTop: 8 }}>
            Your rider is heading to <Text style={{ fontWeight: '700', color: INK }}>{building}</Text>{room.trim() ? `, Room ${room.trim()}` : ''}.
          </Text>
          <Text style={{ fontSize: 13, color: MUTED, marginTop: 10 }}>Redirecting to live tracking…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const fieldLabel = {
    fontSize: 11,
    fontWeight: '700' as const,
    color: MUTED,
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,
    marginBottom: 6,
  };

  const inputStyle = {
    backgroundColor: '#FBF7F2',
    borderWidth: 1,
    borderColor: 'rgba(26,20,16,0.10)',
    color: INK,
  } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
      <Header />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View className="flex-row items-center self-start mt-6 rounded-full px-3 py-1.5" style={{ backgroundColor: 'rgba(255,87,34,0.10)' }}>
          <Zap size={12} color={BRAND} />
          <Text className="ml-1.5 text-[11px] uppercase font-bold" style={{ letterSpacing: 1.2, color: BRAND }}>
            AUIER — Free campus delivery
          </Text>
        </View>
        <Text className="mt-3 font-display" style={{ fontWeight: '900', fontSize: 34, color: INK, letterSpacing: -1, lineHeight: 38 }}>
          What do you{'\n'}<Text style={{ color: BRAND }}>need?</Text>
        </Text>
        <Text className="mt-2 text-[14px]" style={{ color: MUTED, lineHeight: 20 }}>
          Anything in Ifrane, delivered to your building. Flat {FIXED_PRICE_DH} dh. No surprises.
        </Text>

        {/* Form card */}
        <View className="mt-6 bg-white rounded-3xl p-5" style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.07)' }}>
          {/* What do you need */}
          <View className="flex-row items-center mb-1.5">
            <Search size={13} color={MUTED} />
            <Text style={[fieldLabel, { marginBottom: 0, marginLeft: 6 }]}>What do you need?</Text>
          </View>
          <TextInput
            value={what}
            onChangeText={setWhat}
            multiline
            numberOfLines={3}
            placeholder="e.g. Café Hassan tagine kefta + mint tea, or Snack Atlas brochette plate, or anything you want brought from town…"
            placeholderTextColor="#A89E94"
            className="rounded-2xl px-4 py-3 text-[15px]"
            style={[inputStyle, { minHeight: 84, textAlignVertical: 'top' }]}
          />
          <View className="flex-row flex-wrap mt-2.5 mb-4" style={{ gap: 6 }}>
            {QUICK_PICKS.map((s) => (
              <Pressable key={s} onPress={() => setWhat(s)}>
                <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: '#FBF7F2', borderWidth: 1, borderColor: 'rgba(26,20,16,0.10)' }}>
                  <Text className="text-[12px]" style={{ color: MUTED, fontWeight: '500' }}>{s}</Text>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Building selector */}
          <View className="flex-row items-center mb-1.5">
            <Building2 size={13} color={MUTED} />
            <Text style={[fieldLabel, { marginBottom: 0, marginLeft: 6 }]}>Building / Location</Text>
          </View>
          <Pressable onPress={() => setPickerOpen(true)}>
            <View className="flex-row items-center rounded-2xl px-4 py-3.5 mb-4" style={inputStyle}>
              <Text className="flex-1 text-[15px]" style={{ color: building ? INK : '#A89E94', fontWeight: building ? '600' : '400' }} numberOfLines={1}>
                {building || '— Select your building —'}
              </Text>
              <ChevronDown size={16} color={MUTED} />
            </View>
          </Pressable>

          {/* Room number */}
          <View className="flex-row items-center mb-1.5">
            <MapPin size={13} color={MUTED} />
            <Text style={[fieldLabel, { marginBottom: 0, marginLeft: 6 }]}>Room / Suite / Floor (optional)</Text>
          </View>
          <TextInput
            value={room}
            onChangeText={setRoom}
            placeholder="e.g. 204, Suite 3B, Ground floor lobby"
            placeholderTextColor="#A89E94"
            className="rounded-2xl px-4 py-3 text-[15px] mb-4"
            style={inputStyle}
          />

          {/* Rider notes */}
          <Text style={fieldLabel}>Notes for the rider (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. I'm outside the main gate, leave at the door, call first"
            placeholderTextColor="#A89E94"
            className="rounded-2xl px-4 py-3 text-[15px] mb-4"
            style={inputStyle}
          />

          {/* Fixed price strip */}
          <View className="flex-row items-center rounded-2xl p-4" style={{ backgroundColor: '#FFF1EB' }}>
            <View className="flex-1">
              <Text className="text-[13px] font-bold" style={{ color: INK }}>Fixed campus delivery fee</Text>
              <Text className="text-[12px] mt-0.5" style={{ color: MUTED }}>No minimum order · Any item in Ifrane</Text>
            </View>
            <Text style={{ fontWeight: '900', fontSize: 22, color: BRAND, letterSpacing: -0.5 }}>{FIXED_PRICE_DH} dh</Text>
          </View>

          {error && (
            <Text className="text-[13px] mt-3" style={{ color: '#E11D48' }}>{error.message}</Text>
          )}

          {/* CTA */}
          <Pressable onPress={handleSubmit} disabled={!canSubmit} className="mt-4">
            <View className="flex-row items-center justify-center rounded-2xl py-4" style={{ backgroundColor: BRAND, opacity: canSubmit ? 1 : 0.45 }}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text className="text-white font-bold text-[15px]">
                    {!building
                      ? 'Select a building first'
                      : what.trim().length < 3
                        ? 'Describe what you need'
                        : `Request delivery · ${FIXED_PRICE_DH} dh flat`}
                  </Text>
                  <ArrowRight size={17} color="#fff" style={{ marginLeft: 8 }} />
                </>
              )}
            </View>
          </Pressable>
          <Text className="text-[11px] text-center mt-3" style={{ color: MUTED }}>
            Rider heads to your building within 15–30 min · Pay cash or wallet on delivery
          </Text>
        </View>

        {/* How it works strip */}
        <View className="flex-row items-center justify-between mt-6 px-1">
          {['Describe what you want', 'Choose your building', 'Rider heads to you'].map((step, i) => (
            <View key={step} className="flex-row items-center" style={{ flex: 1 }}>
              <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,87,34,0.10)' }}>
                <Text className="text-[11px] font-bold" style={{ color: BRAND }}>{i + 1}</Text>
              </View>
              <Text className="ml-1.5 text-[11px] flex-1" style={{ color: MUTED, fontWeight: '600' }}>{step}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Building picker modal */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: '#FBF7F2', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36, maxHeight: '75%' }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text style={{ fontWeight: '800', fontSize: 20, color: INK, letterSpacing: -0.5 }}>Building / Location</Text>
              <PressableScale onPress={() => setPickerOpen(false)}>
                <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(26,20,16,0.07)' }}>
                  <X size={16} color={INK} />
                </View>
              </PressableScale>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {Object.entries(AUI_BUILDINGS).map(([group, buildings]) => (
                <View key={group} className="mb-4">
                  <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 8 }}>
                    {group}
                  </Text>
                  <View style={{ gap: 6 }}>
                    {buildings.map((b) => {
                      const active = building === b;
                      return (
                        <Pressable
                          key={b}
                          onPress={() => {
                            setBuilding(b);
                            setPickerOpen(false);
                          }}
                        >
                          <View
                            className="flex-row items-center rounded-2xl px-4 py-3"
                            style={{
                              backgroundColor: active ? 'rgba(255,87,34,0.08)' : '#fff',
                              borderWidth: active ? 1.5 : 1,
                              borderColor: active ? BRAND : 'rgba(26,20,16,0.08)',
                            }}
                          >
                            <Text className="flex-1 text-[14px]" style={{ color: active ? BRAND : INK, fontWeight: active ? '700' : '500' }}>
                              {b}
                            </Text>
                            {active && <Check size={15} color={BRAND} strokeWidth={3} />}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
