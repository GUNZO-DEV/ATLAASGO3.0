// AtlaasDriver — incoming OFFER ping.
// A dark-scrim bottom-sheet overlay that surfaces a freshly-assigned job before
// the rider accepts it. RN translation of the design's screen-offer.jsx, kept on
// the dark emerald cockpit (NOT the design's light/coral default).
//
// 18s countdown bar that auto-fires onDecline at 0, a big payout hero, the drop
// landmark, a RouteSummary rail, and Decline (X) / Accept buttons.
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { Timer, X, Navigation } from 'lucide-react-native';
import type { DriverJob } from '../../hooks/useDriverAssignments';
import { BG, CARD, LINE, EMERALD, GLOW, CREAM, MUTED, DANGER, LiveDot, RouteSummary, Tappable } from './ui';

const OFFER_SECS = 18;

export function OfferSheet({
  job,
  onAccept,
  onDecline,
  busy,
}: {
  job: DriverJob;
  onAccept: () => void;
  onDecline: () => void;
  busy?: boolean;
}) {
  const [left, setLeft] = useState(OFFER_SECS);

  // Keep the latest onDecline so the interval never fires a stale callback.
  const declineRef = useRef(onDecline);
  declineRef.current = onDecline;

  // Countdown — auto-declines at 0. Re-armed whenever the surfaced job changes.
  useEffect(() => {
    setLeft(OFFER_SECS);
    const id = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearInterval(id);
          declineRef.current();
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [job.assignmentId]);

  const pct = (left / OFFER_SECS) * 100;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onDecline}>
      {/* dark scrim */}
      <View style={{ flex: 1, backgroundColor: 'rgba(2,8,5,0.72)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onDecline} />
        <MotiView
          from={{ translateY: 40, opacity: 0 }}
          animate={{ translateY: 0, opacity: 1 }}
          transition={{ type: 'timing', duration: 280 }}
        >
          <View
            style={{
              backgroundColor: BG,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderWidth: 1,
              borderColor: 'rgba(52,211,153,0.30)',
              overflow: 'hidden',
            }}
          >
            <SafeAreaView edges={['bottom']}>
              {/* grabber + timer header */}
              <View style={{ paddingHorizontal: 22, paddingTop: 10 }}>
                <View
                  style={{
                    width: 40,
                    height: 5,
                    borderRadius: 999,
                    backgroundColor: LINE,
                    alignSelf: 'center',
                    marginBottom: 14,
                  }}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ marginRight: 7 }}>
                    <LiveDot size={7} />
                  </View>
                  <View
                    style={{
                      backgroundColor: 'rgba(52,211,153,0.14)',
                      borderRadius: 8,
                      paddingHorizontal: 9,
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: GLOW, letterSpacing: 0.4 }}>
                      NEW OFFER
                    </Text>
                  </View>
                  <View style={{ flex: 1 }} />
                  <Timer size={14} color={left <= 5 ? DANGER : MUTED} />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '800',
                      color: left <= 5 ? DANGER : MUTED,
                      marginLeft: 5,
                    }}
                  >
                    {left}s
                  </Text>
                </View>

                {/* countdown bar */}
                <View
                  style={{
                    height: 5,
                    borderRadius: 999,
                    backgroundColor: 'rgba(255,255,255,0.07)',
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      borderRadius: 999,
                      backgroundColor: left <= 5 ? DANGER : EMERALD,
                    }}
                  />
                </View>
              </View>

              {/* payout hero */}
              <View style={{ paddingHorizontal: 22, paddingTop: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '800', letterSpacing: 1.4, color: EMERALD }}>
                      NEW ORDER · #{job.orderId.slice(0, 8)}
                    </Text>
                    <Text
                      style={{
                        fontWeight: '800',
                        fontSize: 52,
                        lineHeight: 56,
                        letterSpacing: -1.6,
                        color: CREAM,
                        marginTop: 4,
                      }}
                    >
                      {job.totalDh}
                      <Text style={{ fontSize: 22, fontWeight: '800', color: MUTED }}> dh</Text>
                    </Text>
                    <Text style={{ fontSize: 12.5, color: MUTED, marginTop: 4 }} numberOfLines={1}>
                      Drop · {job.landmark}
                    </Text>
                  </View>
                </View>

                {/* route rail */}
                <View
                  style={{
                    backgroundColor: CARD,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: LINE,
                    padding: 16,
                    marginTop: 18,
                  }}
                >
                  <RouteSummary
                    pickup={{ name: 'Pickup', area: 'Collect the order' }}
                    dropoff={{ name: job.landmark, area: 'Customer drop-off' }}
                  />
                </View>
              </View>

              {/* actions */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  paddingHorizontal: 22,
                  paddingTop: 18,
                  paddingBottom: 8,
                }}
              >
                <Tappable onPress={onDecline} disabled={busy} style={{ flex: 0, width: 62 }}>
                  <View
                    style={{
                      width: 62,
                      height: 56,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: `${DANGER}55`,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    <X size={22} color={DANGER} />
                  </View>
                </Tappable>
                <Tappable onPress={onAccept} disabled={busy}>
                  <LinearGradient
                    colors={[GLOW, EMERALD]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ borderRadius: 16 }}
                  >
                    <View
                      style={{
                        height: 56,
                        borderRadius: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: busy ? 0.6 : 1,
                      }}
                    >
                      {busy ? (
                        <ActivityIndicator color="#04140D" />
                      ) : (
                        <>
                          <Navigation size={17} color="#04140D" />
                          <Text style={{ fontWeight: '800', fontSize: 15.5, color: '#04140D', marginLeft: 8 }}>
                            Accept · {job.totalDh} dh
                          </Text>
                        </>
                      )}
                    </View>
                  </LinearGradient>
                </Tappable>
              </View>
            </SafeAreaView>
          </View>
        </MotiView>
      </View>
    </Modal>
  );
}
