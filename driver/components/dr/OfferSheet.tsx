// AtlaasDriver — incoming OFFER ping.
// A dark-scrim bottom-sheet overlay that surfaces a freshly-assigned job before
// the rider accepts it. RN translation of the design's screen-offer.jsx, on the
// light cream/white sheet with the sunset-orange accent.
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
import { BG, CARD, LINE, LINE2, BG2, EMERALD, GLOW, CREAM, MUTED, DANGER, LiveDot, RouteSummary, Tappable } from './ui';

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
      {/* warm dark scrim (design: rgba(8,7,5,.55)) */}
      <View style={{ flex: 1, backgroundColor: 'rgba(8,7,5,0.55)', justifyContent: 'flex-end' }}>
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
              borderColor: LINE,
              overflow: 'hidden',
              // soft lift off the scrim
              shadowColor: '#1A1410',
              shadowOffset: { width: 0, height: -10 },
              shadowOpacity: 0.18,
              shadowRadius: 40,
              elevation: 12,
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
                      backgroundColor: 'rgba(255,87,34,0.12)', // --grad-soft / sunset tint
                      borderRadius: 8,
                      paddingHorizontal: 9,
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: EMERALD, letterSpacing: 0.4 }}>
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

                {/* countdown bar — light track, sunset-gradient fill */}
                <View
                  style={{
                    height: 5,
                    borderRadius: 999,
                    backgroundColor: BG2,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      borderRadius: 999,
                      overflow: 'hidden',
                    }}
                  >
                    {left <= 5 ? (
                      <View style={{ flex: 1, backgroundColor: DANGER }} />
                    ) : (
                      <LinearGradient
                        colors={[EMERALD, GLOW]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ flex: 1 }}
                      />
                    )}
                  </View>
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

                {/* route rail (design .ag-card) */}
                <View
                  style={{
                    backgroundColor: CARD,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: LINE2,
                    padding: 16,
                    marginTop: 18,
                    // soft elevation (--sh-1)
                    shadowColor: '#1A1410',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.06,
                    shadowRadius: 18,
                    elevation: 2,
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
                      borderColor: LINE,
                      backgroundColor: CARD,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: busy ? 0.6 : 1,
                      // soft elevation (--sh-1)
                      shadowColor: '#1A1410',
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.06,
                      shadowRadius: 18,
                      elevation: 2,
                    }}
                  >
                    <X size={22} color={DANGER} />
                  </View>
                </Tappable>
                <Tappable onPress={onAccept} disabled={busy}>
                  <LinearGradient
                    colors={[EMERALD, GLOW]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      borderRadius: 16,
                      // sunset glow (--sh-glow)
                      shadowColor: EMERALD,
                      shadowOffset: { width: 0, height: 14 },
                      shadowOpacity: 0.38,
                      shadowRadius: 34,
                      elevation: 6,
                    }}
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
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Navigation size={17} color="#fff" />
                          <Text style={{ fontWeight: '800', fontSize: 15.5, color: '#fff', marginLeft: 8 }}>
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
