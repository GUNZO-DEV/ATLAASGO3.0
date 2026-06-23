import { useEffect, useRef, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { CheckCheck, MapPin, MessageCircle, Send, X } from 'lucide-react-native';
import { BG, CARD, LINE, EMERALD, CREAM, MUTED, DANGER, GRAD, R } from './ui';
import { RIDER_QUICK_REPLIES, useOrderChat, type OrderMessage } from '../../hooks/useOrderChat';

/**
 * Driver-side order chat (light + sunset). Same realtime thread the customer
 * sees — the rider sends as sender_role 'rider'. RLS already permits the
 * active rider, so this just mounts the UI. Mirrors the customer OrderChat:
 * cream page, white inbound bubbles, sunset-orange own-bubbles with white text.
 */
const ROLE_LABEL: Record<string, string> = {
  customer: 'Customer',
  rider: 'You',
  merchant: 'Kitchen',
  admin: 'Support',
  super_admin: 'Support',
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Bubble({ message, mine, showLabel }: { message: OrderMessage; mine: boolean; showLabel: boolean }) {
  const isLocation =
    message.kind === 'location' && message.location_lat != null && message.location_lng != null;

  const openMap = () => {
    if (!isLocation) return;
    void Linking.openURL(`https://www.google.com/maps?q=${message.location_lat},${message.location_lng}`);
  };

  // Bubble body — shared between the gradient (mine) and white (inbound) shells.
  const bubbleInner = (
    <>
      {isLocation ? (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: mine ? 'rgba(255,255,255,0.2)' : 'rgba(255,87,34,0.10)' }}>
            <MapPin size={14} color={mine ? '#fff' : EMERALD} strokeWidth={2.5} />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: mine ? '#fff' : CREAM }}>
              {message.body || 'My location'}
            </Text>
            <Text style={{ fontSize: 11, marginTop: 1, color: mine ? 'rgba(255,255,255,0.75)' : MUTED }}>Tap to open map</Text>
          </View>
        </View>
      ) : (
        <Text style={{ fontSize: 14.5, lineHeight: 20, color: mine ? '#fff' : CREAM }}>{message.body}</Text>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 3, gap: 4 }}>
        <Text style={{ fontSize: 10, color: mine ? 'rgba(255,255,255,0.65)' : MUTED }}>{fmtTime(message.created_at)}</Text>
        {mine ? <CheckCheck size={13} color={message.read_at ? '#8AE9FF' : 'rgba(255,255,255,0.55)'} /> : null}
      </View>
    </>
  );

  return (
    <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%', marginBottom: 8 }}>
      {!mine && showLabel ? (
        <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1, color: MUTED, marginBottom: 4, marginLeft: 8, textTransform: 'uppercase' }}>
          {ROLE_LABEL[message.sender_role] ?? 'Support'}
        </Text>
      ) : null}
      <Pressable onPress={openMap} disabled={!isLocation}>
        {/* own-bubble carries the shared sunset gradient; inbound stays white */}
        {mine ? (
          <LinearGradient
            colors={GRAD.colors}
            start={GRAD.start}
            end={GRAD.end}
            style={{
              borderRadius: 20,
              borderBottomRightRadius: 6,
              overflow: 'hidden',
              ...(isLocation
                ? { borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderStyle: 'dashed' }
                : {}),
            }}
          >
            <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>{bubbleInner}</View>
          </LinearGradient>
        ) : (
          <View
            style={{
              backgroundColor: CARD,
              borderWidth: 1,
              borderColor: LINE,
              borderRadius: 20,
              borderBottomLeftRadius: 6,
              paddingHorizontal: 14,
              paddingVertical: 10,
              ...(isLocation
                ? { borderWidth: 1, borderColor: 'rgba(255,87,34,0.3)', borderStyle: 'dashed' }
                : {}),
            }}
          >
            {bubbleInner}
          </View>
        )}
      </Pressable>
    </View>
  );
}

export function OrderChat({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { messages, loading, sending, error, send, markRead, me } = useOrderChat(orderId, 'rider');
  const [draft, setDraft] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const listRef = useRef<FlatList<OrderMessage>>(null);

  // Mark inbound unread as read while the thread is open.
  useEffect(() => {
    if (!me) return;
    const unread = messages.filter((m) => m.sender_id !== me.id && !m.read_at).map((m) => m.id);
    if (unread.length === 0) return;
    void markRead(unread);
  }, [messages, me, markRead]);

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
      await send('My location', 'location', { lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      /* GPS errors are non-fatal for chat */
    } finally {
      setPinBusy(false);
    }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 12, borderBottomWidth: 1, borderColor: LINE }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={{ width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,87,34,0.10)' }}>
              <MessageCircle size={18} color={EMERALD} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: CREAM, letterSpacing: -0.3 }}>Chat with customer</Text>
              <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: MUTED, marginTop: 1 }}>
                #{orderId.slice(0, 6).toUpperCase()}
              </Text>
            </View>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <View style={{ width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: CARD, borderWidth: 1, borderColor: LINE }}>
              <X size={17} color={CREAM} />
            </View>
          </Pressable>
        </View>

        {!me ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            <MessageCircle size={28} color={MUTED} />
            <Text style={{ marginTop: 14, fontSize: 17, fontWeight: '800', color: CREAM }}>Sign in to chat</Text>
          </View>
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
            {loading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={EMERALD} />
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(m) => m.id}
                contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8, flexGrow: 1 }}
                onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
                ListEmptyComponent={
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
                    <Text style={{ fontSize: 34 }}>💬</Text>
                    <Text style={{ marginTop: 12, fontSize: 16, fontWeight: '800', color: CREAM }}>Say hello to your customer</Text>
                    <Text style={{ marginTop: 6, fontSize: 13, textAlign: 'center', color: MUTED, lineHeight: 19 }}>
                      Keep them posted on pickup and arrival — they see it live.
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

            {error ? <Text style={{ fontSize: 12, paddingHorizontal: 18, paddingBottom: 4, color: DANGER }}>{error}</Text> : null}

            {/* Quick replies */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, gap: 8, paddingVertical: 8 }} style={{ flexGrow: 0 }}>
              {RIDER_QUICK_REPLIES.map((q) => (
                <Pressable key={q} onPress={() => onSend(q)} disabled={sending}>
                  <View style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: CARD, borderWidth: 1, borderColor: 'rgba(255,87,34,0.25)', opacity: sending ? 0.5 : 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: EMERALD }}>{q}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            {/* Compose */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 2, paddingBottom: 6, borderTopWidth: 1, borderColor: LINE, gap: 8 }}>
              <Pressable onPress={sharePin} disabled={pinBusy}>
                <View style={{ width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: CARD, borderWidth: 1, borderColor: LINE, opacity: pinBusy ? 0.5 : 1 }}>
                  {pinBusy ? <ActivityIndicator size="small" color={EMERALD} /> : <MapPin size={17} color={EMERALD} />}
                </View>
              </Pressable>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Message the customer…"
                placeholderTextColor="#A89E94"
                multiline
                style={{ flex: 1, backgroundColor: CARD, borderWidth: 1, borderColor: LINE, borderRadius: R.lg, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, maxHeight: 110, fontSize: 14, color: CREAM }}
              />
              <Pressable onPress={() => onSend()} disabled={sending || !draft.trim()}>
                <LinearGradient
                  colors={GRAD.colors}
                  start={GRAD.start}
                  end={GRAD.end}
                  style={{ width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', opacity: sending || !draft.trim() ? 0.4 : 1 }}
                >
                  <Send size={16} color="#fff" />
                </LinearGradient>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  );
}
