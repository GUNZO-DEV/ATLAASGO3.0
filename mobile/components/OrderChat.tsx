import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { CheckCheck, MapPin, MessageCircle, Send, X } from 'lucide-react-native';
import { PressableScale } from './primitives/PressableScale';
import {
  CUSTOMER_QUICK_REPLIES,
  useOrderChat,
  type ChatRole,
  type OrderMessage,
} from '../hooks/useOrderChat';

/**
 * Full-screen order chat — mobile port of web src/components/OrderChat.tsx.
 * Realtime thread between the customer, the kitchen, and the rider for one
 * order. Own messages sit right in coral with double-check read receipts;
 * inbound messages sit left with a role label. The pin button shares the
 * sender's live GPS as a `location` message.
 */

const INK = '#1A1410';
const MUTED = '#7A6F66';
const BRAND = '#FF5722';
const CREAM = '#FBF7F2';
const LINE = 'rgba(26,20,16,0.08)';

const ROLE_LABEL_KEYS: Record<string, string> = {
  customer: 'roleCustomer',
  rider: 'roleRider',
  merchant: 'roleKitchen',
  admin: 'roleSupport',
  super_admin: 'roleSupport',
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Bubble({ message, mine, showLabel }: { message: OrderMessage; mine: boolean; showLabel: boolean }) {
  const { t: tr } = useTranslation();
  const isLocation = message.kind === 'location' && message.location_lat != null && message.location_lng != null;

  const openMap = () => {
    if (!isLocation) return;
    void Linking.openURL(
      `https://www.google.com/maps?q=${message.location_lat},${message.location_lng}`,
    );
  };

  return (
    <View
      style={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '80%',
        marginBottom: 8,
      }}
    >
      {!mine && showLabel ? (
        <Text
          className="text-[10px] uppercase font-bold mb-1 ml-2"
          style={{ letterSpacing: 1.0, color: MUTED }}
        >
          {tr(`chat.${ROLE_LABEL_KEYS[message.sender_role] ?? 'roleSupport'}`)}
        </Text>
      ) : null}
      <Pressable onPress={openMap} disabled={!isLocation}>
        <View
          className="rounded-3xl px-4 py-3"
          style={{
            backgroundColor: mine ? BRAND : '#fff',
            borderWidth: mine ? 0 : 1,
            borderColor: LINE,
            borderBottomRightRadius: mine ? 6 : 24,
            borderBottomLeftRadius: mine ? 24 : 6,
            ...(isLocation
              ? { borderWidth: 1, borderColor: mine ? 'rgba(255,255,255,0.4)' : 'rgba(255,87,34,0.3)', borderStyle: 'dashed' }
              : {}),
          }}
        >
          {isLocation ? (
            <View className="flex-row items-center">
              <View
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: mine ? 'rgba(255,255,255,0.2)' : 'rgba(255,87,34,0.10)' }}
              >
                <MapPin size={14} color={mine ? '#fff' : BRAND} strokeWidth={2.5} />
              </View>
              <View className="ml-2.5">
                <Text className="text-[14px]" style={{ fontWeight: '700', color: mine ? '#fff' : INK }}>
                  {message.body || tr('chat.myLocation')}
                </Text>
                <Text className="text-[11px] mt-0.5" style={{ color: mine ? 'rgba(255,255,255,0.75)' : MUTED }}>
                  {tr('chat.tapToOpenMap')}
                </Text>
              </View>
            </View>
          ) : (
            <Text className="text-[14px]" style={{ color: mine ? '#fff' : INK, lineHeight: 20 }}>
              {message.body}
            </Text>
          )}
          <View className="flex-row items-center justify-end mt-1" style={{ gap: 4 }}>
            <Text className="text-[10px]" style={{ color: mine ? 'rgba(255,255,255,0.65)' : MUTED }}>
              {fmtTime(message.created_at)}
            </Text>
            {mine ? (
              <CheckCheck size={13} color={message.read_at ? '#8AE9FF' : 'rgba(255,255,255,0.55)'} />
            ) : null}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export function OrderChat({
  orderId,
  role,
  onClose,
}: {
  orderId: string;
  role: 'customer' | 'merchant' | 'rider';
  onClose: () => void;
}) {
  const { t: tr } = useTranslation();
  const { messages, loading, sending, error, send, markRead, me } = useOrderChat(
    orderId,
    role as ChatRole,
  );
  const [draft, setDraft] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const listRef = useRef<FlatList<OrderMessage>>(null);

  // Mark inbound unread messages as read while the thread is open.
  useEffect(() => {
    if (!me) return;
    const unread = messages
      .filter((m) => m.sender_id !== me.id && !m.read_at)
      .map((m) => m.id);
    if (unread.length === 0) return;
    void markRead(unread);
  }, [messages, me, markRead]);

  // Keep the latest message in view.
  useEffect(() => {
    if (messages.length === 0) return;
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages.length]);

  async function onSend(text?: string) {
    const body = (text ?? draft).trim();
    if (!body) return;
    const ok = await send(body);
    if (ok && text === undefined) setDraft('');
  }

  async function sharePin() {
    if (pinBusy) return;
    setPinBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await send(tr('chat.myLocation'), 'location', {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    } catch {
      // Best-effort — GPS errors are non-fatal for chat.
    } finally {
      setPinBusy(false);
    }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: CREAM }} edges={['top', 'bottom']}>
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-5 pt-2 pb-3"
          style={{ borderBottomWidth: 1, borderColor: LINE }}
        >
          <View className="flex-row items-center flex-1">
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(255,87,34,0.10)' }}
            >
              <MessageCircle size={18} color={BRAND} />
            </View>
            <View className="ml-3">
              <Text className="text-[16px]" style={{ fontWeight: '900', color: INK, letterSpacing: -0.3 }}>
                {tr('chat.title')}
              </Text>
              <Text className="text-[11px] uppercase font-bold mt-0.5" style={{ letterSpacing: 1.2, color: MUTED }}>
                #{orderId.slice(0, 6).toUpperCase()}
              </Text>
            </View>
          </View>
          <PressableScale onPress={onClose}>
            <View
              className="w-10 h-10 rounded-full items-center justify-center bg-white"
              style={{ borderWidth: 1, borderColor: LINE }}
            >
              <X size={17} color={INK} />
            </View>
          </PressableScale>
        </View>

        {!me ? (
          <View className="flex-1 items-center justify-center px-8">
            <MessageCircle size={28} color={MUTED} />
            <Text className="mt-4 text-[18px]" style={{ fontWeight: '800', color: INK }}>
              {tr('chat.signInTitle')}
            </Text>
            <Text className="mt-2 text-[13px] text-center" style={{ color: MUTED, lineHeight: 19 }}>
              {tr('chat.signInBody')}
            </Text>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          >
            {/* Thread */}
            {loading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color={BRAND} />
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(m) => m.id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, flexGrow: 1 }}
                onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
                ListEmptyComponent={
                  <View className="flex-1 items-center justify-center px-8">
                    <Text style={{ fontSize: 34 }}>💬</Text>
                    <Text className="mt-3 text-[17px]" style={{ fontWeight: '800', color: INK }}>
                      {tr('chat.emptyTitle')}
                    </Text>
                    <Text className="mt-1.5 text-[13px] text-center" style={{ color: MUTED, lineHeight: 19 }}>
                      {tr('chat.emptyBody')}
                    </Text>
                  </View>
                }
                renderItem={({ item, index }) => {
                  const mine = item.sender_id === me.id;
                  const prev = messages[index - 1];
                  const showLabel = !mine && (!prev || prev.sender_id !== item.sender_id);
                  return <Bubble message={item} mine={mine} showLabel={showLabel} />;
                }}
              />
            )}

            {error ? (
              <Text className="text-[12px] px-5 pb-1" style={{ color: '#E11D48' }}>{error}</Text>
            ) : null}

            {/* Quick replies */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 8 }}
              style={{ flexGrow: 0 }}
            >
              {CUSTOMER_QUICK_REPLIES.map((q) => (
                <Pressable key={q} onPress={() => onSend(q)} disabled={sending}>
                  <View
                    className="rounded-full px-4 py-2 bg-white"
                    style={{ borderWidth: 1, borderColor: 'rgba(255,87,34,0.25)', opacity: sending ? 0.5 : 1 }}
                  >
                    <Text className="text-[12px] font-bold" style={{ color: BRAND }}>{q}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            {/* Compose */}
            <View
              className="flex-row items-center px-4 pt-2 pb-3"
              style={{ borderTopWidth: 1, borderColor: LINE, gap: 8 }}
            >
              <Pressable onPress={sharePin} disabled={pinBusy}>
                <View
                  className="w-11 h-11 rounded-full items-center justify-center bg-white"
                  style={{ borderWidth: 1, borderColor: LINE, opacity: pinBusy ? 0.5 : 1 }}
                >
                  {pinBusy ? (
                    <ActivityIndicator size="small" color={BRAND} />
                  ) : (
                    <MapPin size={17} color={BRAND} />
                  )}
                </View>
              </Pressable>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={tr('chat.placeholder')}
                placeholderTextColor="#A89E94"
                multiline
                style={{
                  flex: 1,
                  backgroundColor: '#fff',
                  borderWidth: 1,
                  borderColor: LINE,
                  borderRadius: 22,
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: 12,
                  maxHeight: 110,
                  fontSize: 14,
                  color: INK,
                }}
              />
              <Pressable onPress={() => onSend()} disabled={sending || !draft.trim()}>
                <View
                  className="w-11 h-11 rounded-full items-center justify-center"
                  style={{ backgroundColor: BRAND, opacity: sending || !draft.trim() ? 0.4 : 1 }}
                >
                  <Send size={16} color="#fff" />
                </View>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  );
}
