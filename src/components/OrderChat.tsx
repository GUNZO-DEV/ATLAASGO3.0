import { useEffect, useMemo, useRef, useState } from 'react';
import * as I from '../icons/Icon';
import { useOrderChat, CUSTOMER_QUICK_REPLIES } from '../lib/chat';
import { useOrderAssignment } from '../lib/orderAssignment';
import { supabase } from '../lib/supabase';
import type { AppRole } from '../lib/database.types';
import { FadeUp } from './visual/ScrollReveal';

const ROLE_THEME: Record<AppRole, { bg: string; border: string; text: string; label: string }> = {
  customer:    { bg: 'linear-gradient(135deg, #3B82F6, #2563EB)', border: '#2563EB', text: 'white',     label: 'You' },
  rider:       { bg: 'linear-gradient(135deg, #FF8A65, #FF5722)', border: '#FF5722', text: 'white',     label: 'Rider' },
  merchant:    { bg: 'linear-gradient(135deg, #34D399, #059669)', border: '#059669', text: 'white',     label: 'Kitchen' },
  admin:       { bg: 'rgba(0,0,0,0.06)',                          border: 'transparent', text: 'var(--fg)', label: 'Support' },
  super_admin: { bg: 'rgba(0,0,0,0.06)',                          border: 'transparent', text: 'var(--fg)', label: 'Support' },
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function OrderChat({ orderId }: { orderId: string | undefined }) {
  const { messages, loading, send, sending, me } = useOrderChat(orderId);
  const { rider } = useOrderAssignment(orderId);
  const [draft, setDraft] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [partnerName, setPartnerName] = useState<string>('');
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Fetch partner name based on role
  useEffect(() => {
    if (!orderId || !me) return;
    const inbound = messages.find((m) => m.sender_id !== me.id);
    if (!inbound) return;

    (async () => {
      if (inbound.sender_role === 'rider' && rider) {
        setPartnerName('Your driver');
      } else if (inbound.sender_role === 'merchant') {
        // Fetch restaurant name from order
        const { data } = await supabase
          .from('orders')
          .select('items')
          .eq('id', orderId)
          .maybeSingle();
        if (data?.items?.[0]?.restaurantName) {
          setPartnerName(data.items[0].restaurantName);
        }
      } else if (inbound.sender_role === 'customer') {
        setPartnerName('Customer');
      }
    })();
  }, [messages, me, orderId, rider]);

  // Mark unread inbound messages as read once they're in view.
  useEffect(() => {
    if (!orderId || !me) return;
    const unread = messages.filter((m) => m.sender_id !== me.id && !m.read_at).map((m) => m.id);
    if (unread.length === 0) return;
    void supabase
      .from('order_messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', unread);
  }, [messages, me, orderId]);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function onSend(text?: string) {
    const body = text ?? draft;
    if (!body.trim()) return;
    const ok = await send(body);
    if (ok) {
      setDraft('');
      setShowEmoji(false);
    }
  }

  async function shareLocation() {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const label = `📍 My location: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
        void onSend(label);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  const otherParty = useMemo(() => {
    const inbound = messages.find((m) => m.sender_id !== me?.id);
    return inbound?.sender_role ?? ('rider' as AppRole);
  }, [messages, me]);

  const otherTheme = ROLE_THEME[otherParty] ?? ROLE_THEME.rider;

  const EMOJIS = ['🙏', '😊', '👍', '🔥', '❤️', '😅', '🚗', '⏱', '📦', '☕'];

  return (
    <FadeUp y={14}>
      <div className="order-chat-pro">
        {/* WhatsApp-style header */}
        <div className="chat-pro-head">
          <div className="chat-pro-avatar" style={{ background: otherTheme.bg, color: otherTheme.text }}>
            {otherParty === 'rider' ? (rider?.user_id.substring(0, 1).toUpperCase() ?? '?') : otherParty === 'merchant' ? '🍽' : '🤝'}
          </div>
          <div className="chat-pro-head-meta">
            <div className="chat-pro-name">
              {partnerName || (otherParty === 'rider' ? 'Your driver' : otherParty === 'merchant' ? 'Restaurant' : 'Support')}
            </div>
            <div className="chat-pro-status">
              <span className="online-dot" /> online ·{' '}
              {otherParty === 'rider' ? (rider?.vehicle ? `${rider.vehicle} · ${rider.plate}` : 'connecting…') : 'usually replies in 30s'}
            </div>
          </div>
          <div className="chat-pro-actions">
            <button className="chat-pro-action" aria-label="Call">
              <I.Phone size={16} />
            </button>
            <button className="chat-pro-action" aria-label="More">
              <I.Chat size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable thread */}
        <div className="chat-pro-scroll" ref={scrollerRef}>
          {loading && <div className="chat-empty">Opening conversation…</div>}
          {!loading && messages.length === 0 && (
            <div className="chat-pro-empty">
              <div className="chat-pro-empty-emoji">💬</div>
              <div className="chat-pro-empty-title">Say salam</div>
              <div className="chat-pro-empty-sub">Tap a quick reply or type a note below.</div>
            </div>
          )}

          {messages.map((m, i) => {
            const mine = me?.id === m.sender_id;
            const theme = ROLE_THEME[m.sender_role] ?? ROLE_THEME.rider;
            const prev = messages[i - 1];
            const showAvatar = !mine && (!prev || prev.sender_id !== m.sender_id);
            const isLocation = m.kind === 'location' || (m.body?.startsWith('📍') ?? false);

            return (
              <div key={m.id} className={`chat-pro-row ${mine ? 'mine' : 'theirs'}`}>
                {!mine && (
                  <div
                    className="chat-pro-row-avatar"
                    style={{
                      background: showAvatar ? theme.bg : 'transparent',
                      color: theme.text,
                      opacity: showAvatar ? 1 : 0,
                    }}
                  >
                    {m.sender_role === 'rider' ? 'Y' : m.sender_role === 'merchant' ? '🍽' : '🤝'}
                  </div>
                )}
                <div
                  className={`chat-pro-bubble ${mine ? 'mine' : 'theirs'} ${isLocation ? 'is-location' : ''}`}
                  style={
                    mine
                      ? { background: ROLE_THEME.customer.bg, color: ROLE_THEME.customer.text }
                      : { background: theme.bg, color: theme.text }
                  }
                >
                  {!mine && showAvatar && (
                    <div className="chat-pro-sender">{theme.label}</div>
                  )}
                  <div className="chat-pro-body">{m.body}</div>
                  <div className="chat-pro-stamp">
                    <span>{fmtTime(m.created_at)}</span>
                    {mine && (
                      <span className={`chat-pro-receipts ${m.read_at ? 'read' : 'sent'}`}>
                        <I.Check size={11} />
                        <I.Check size={11} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick replies */}
        <div className="chat-pro-quick">
          {CUSTOMER_QUICK_REPLIES.map((q) => (
            <button key={q} onClick={() => onSend(q)} disabled={sending}>
              {q}
            </button>
          ))}
        </div>

        {/* Emoji palette (collapsible) */}
        {showEmoji && (
          <div className="chat-pro-emojis">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setDraft((d) => d + e)}
                aria-label={`Add ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {/* Compose */}
        <div className="chat-pro-compose">
          <button
            className="chat-pro-icon-btn"
            onClick={() => setShowEmoji((s) => !s)}
            aria-label="Emoji"
            aria-expanded={showEmoji}
          >
            <span style={{ fontSize: 18 }}>{showEmoji ? '×' : '😊'}</span>
          </button>
          <button
            className="chat-pro-icon-btn"
            onClick={shareLocation}
            aria-label="Share location"
          >
            <I.Pin size={16} />
          </button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void onSend();
              }
            }}
            placeholder="Type a message…"
            aria-label="Message"
          />
          <button
            className="chat-pro-send"
            onClick={() => onSend()}
            disabled={sending || !draft.trim()}
            aria-label="Send"
          >
            <I.Arrow size={16} />
          </button>
        </div>
      </div>
    </FadeUp>
  );
}
