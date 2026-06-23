// AtlaasDriver — incoming OFFER ping.
// A dark-scrim bottom-sheet overlay that surfaces a freshly-assigned job before
// the rider accepts it. RN translation of the design's screen-offer.jsx, on the
// light cream/white sheet with the sunset-orange accent.
//
// 18s countdown bar that auto-fires onDecline at 0 (red <5s bar), the rich
// DriverJob payout hero with its base/boost/tips breakdown, the
// distance · eta · items trip column, and a RouteSummary rail with the real
// pickup merchant. Accept routes through the race-safe accept_order_offer RPC
// (the caller wires onAccept → acceptAssignment).
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { Timer, X, Navigation, Snowflake } from 'lucide-react-native';
import type { DriverJob } from '../../hooks/useDriverAssignments';
import {
  BG,
  CARD,
  LINE,
  LINE2,
  BG2,
  EMERALD,
  GLOW,
  CREAM,
  MUTED,
  DANGER,
  SNOW,
  GRAD,
  R,
  SHADOW_2,
  LiveDot,
  RouteSummary,
  Tappable,
} from './ui';

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
  }, [job.id]);

  const pct = (left / OFFER_SECS) * 100;
  const urgent = left <= 5;
  const hasBoost = job.boostDh > 0;
  const hasTip = job.tipDh > 0;

  // Trip stat column — "distanceKm · etaMin · itemCount items". Each piece is
  // omitted when it has no backing value (distance/eta need a rider fix).
  const tripStats: string[] = [];
  if (job.distanceKm != null) tripStats.push(`${job.distanceKm} km`);
  if (job.etaMin != null) tripStats.push(`~${job.etaMin} min`);
  tripStats.push(`${job.itemCount} ${job.itemCount === 1 ? 'item' : 'items'}`);

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
              borderTopLeftRadius: R.xl,
              borderTopRightRadius: R.xl,
              borderWidth: 1,
              borderColor: LINE,
              overflow: 'hidden',
              // elevated sheet lift off the scrim (--sh-2)
              ...SHADOW_2,
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
                  {hasBoost ? (
                    // Snow-boost badge — surge is live on this offer.
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        backgroundColor: 'rgba(90,169,230,0.12)',
                        borderRadius: 8,
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                      }}
                    >
                      <Snowflake size={12} color={SNOW} strokeWidth={2.5} />
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: SNOW, letterSpacing: 0.4 }}>
                        SNOW BOOST
                      </Text>
                    </View>
                  ) : (
                    // Plain "New offer" pill (no surge).
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                    </View>
                  )}
                  <View style={{ flex: 1 }} />
                  <Timer size={14} color={urgent ? DANGER : MUTED} />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '800',
                      color: urgent ? DANGER : MUTED,
                      marginLeft: 5,
                    }}
                  >
                    {left}s
                  </Text>
                </View>

                {/* countdown bar — light track, sunset-gradient fill (red <5s) */}
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
                    {urgent ? (
                      <View style={{ flex: 1, backgroundColor: DANGER }} />
                    ) : (
                      <LinearGradient
                        colors={GRAD.colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ flex: 1 }}
                      />
                    )}
                  </View>
                </View>
              </View>

              {/* payout hero + trip-stat column */}
              <View style={{ paddingHorizontal: 22, paddingTop: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
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
                      {job.payoutDh}
                      <Text style={{ fontSize: 22, fontWeight: '800', color: MUTED }}> dh</Text>
                    </Text>
                    {/* fare breakdown — base + boost (snow) + tips; pieces hidden at 0 */}
                    <Text style={{ fontSize: 12.5, color: MUTED, marginTop: 4 }} numberOfLines={1}>
                      base {job.baseDh}
                      {hasBoost ? (
                        <Text style={{ color: SNOW, fontWeight: '700' }}> + boost {job.boostDh} (snow)</Text>
                      ) : null}
                      {hasTip ? <Text> + tips {job.tipDh}</Text> : null}
                    </Text>
                  </View>

                  {/* trip stat column */}
                  <View style={{ alignItems: 'flex-end' }}>
                    {tripStats.map((s, i) => (
                      <Text
                        key={i}
                        style={{
                          fontSize: 14,
                          fontWeight: '800',
                          color: i === 0 ? CREAM : MUTED,
                          marginTop: i === 0 ? 0 : 2,
                        }}
                      >
                        {s}
                      </Text>
                    ))}
                  </View>
                </View>

                {/* route rail (design .ag-card) — real pickup merchant */}
                <View
                  style={{
                    backgroundColor: CARD,
                    borderRadius: R.md,
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
                    pickup={{
                      name: job.pickupName,
                      area: job.pickupArea || 'Collect the order',
                      dist: job.distanceKm != null ? `${job.distanceKm} km` : undefined,
                    }}
                    dropoff={{ name: job.dropName, area: job.dropArea || 'Customer drop-off' }}
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
                      borderRadius: R.md,
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
                    colors={GRAD.colors}
                    start={GRAD.start}
                    end={GRAD.end}
                    style={{
                      borderRadius: R.md,
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
                        borderRadius: R.md,
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
                            Accept · {job.payoutDh} dh
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
