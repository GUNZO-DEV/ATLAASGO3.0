"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Phone,
  MapPin,
  Send,
  Smile,
  Check,
  CheckCheck,
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

type Sender = "customer" | "rider" | "merchant" | "system";

interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: string;
  read: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEMO_MESSAGES: Message[] = [
  {
    id: "1",
    text: "Commande acceptée",
    sender: "system",
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    read: true,
  },
  {
    id: "2",
    text: "Bonjour ! Je suis en route vers le restaurant.",
    sender: "rider",
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    read: true,
  },
  {
    id: "3",
    text: "Super, merci !",
    sender: "customer",
    timestamp: new Date(Date.now() - 11 * 60000).toISOString(),
    read: true,
  },
  {
    id: "4",
    text: "Commande récupérée, j'arrive dans ~10 min",
    sender: "rider",
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    read: true,
  },
  {
    id: "5",
    text: "Je suis devant l'entrée principale",
    sender: "rider",
    timestamp: new Date(Date.now() - 1 * 60000).toISOString(),
    read: false,
  },
];

const QUICK_REPLIES = [
  "Où en êtes-vous ?",
  "Je suis en bas",
  "Merci !",
  "J'arrive dans 2 min",
  "Quel étage ?",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// ─── Bubble ───────────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.sender === "system") {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[#6B7A9E] text-xs bg-[#F5F0E8] rounded-full px-3 py-1">
          {msg.text}
        </span>
      </div>
    );
  }

  const isCustomer = msg.sender === "customer";

  const bubbleColor =
    msg.sender === "customer"
      ? "bg-[#1B2440] text-white"
      : msg.sender === "rider"
      ? "bg-[#E55A26] text-white"
      : "bg-[#2DC08A] text-white";

  return (
    <div className={`flex ${isCustomer ? "justify-end" : "justify-start"} mb-2`}>
      <div className={`rounded-2xl px-4 py-2.5 max-w-[75%] ${bubbleColor}`}>
        <p className="text-sm leading-snug">{msg.text}</p>
        <div className={`flex items-center gap-1 mt-1 ${isCustomer ? "justify-end" : "justify-start"}`}>
          <span className="text-[10px] opacity-70">{formatTime(msg.timestamp)}</span>
          {isCustomer && (
            msg.read
              ? <CheckCheck className="w-3 h-3 opacity-70" />
              : <Check className="w-3 h-3 opacity-50" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrderChatPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string | undefined;

  const [authed, setAuthed] = useState(false);
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);
  const [input, setInput] = useState("");
  const [riderName] = useState("Yassine M.");
  const [isTyping, setIsTyping] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auth guard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/register");
      } else {
        setAuthed(true);
      }
    });
    return unsub;
  }, [router]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Simulate occasional typing indicator
  useEffect(() => {
    if (!authed) return;
    const timer = setTimeout(() => {
      setIsTyping(true);
      const hideTimer = setTimeout(() => setIsTyping(false), 2500);
      return () => clearTimeout(hideTimer);
    }, 8000);
    return () => clearTimeout(timer);
  }, [authed]);

  function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content) return;

    const newMsg: Message = {
      id: Date.now().toString(),
      text: content,
      sender: "customer",
      timestamp: new Date().toISOString(),
      read: false,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    inputRef.current?.focus();
  }

  if (!authed) return null;

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      {/* ── Header ── */}
      <div className="fixed top-0 left-0 right-0 bg-white z-50 shadow-[0_2px_10px_rgba(27,36,64,0.06)]">
        <div className="max-w-[600px] mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href={`/orders/${orderId}`}
            className="w-9 h-9 rounded-xl bg-[#F5F0E8] flex items-center justify-center shrink-0"
          >
            <ChevronLeft className="w-5 h-5 text-[#1B2440]" />
          </Link>

          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-[#1B2440] text-sm truncate">
              Commande #{orderId?.slice(0, 6)}
            </p>
            <p className="text-[11px] text-[#6B7A9E]">
              {riderName} · En ligne
            </p>
          </div>

          <button
            aria-label="Appeler le livreur"
            className="w-9 h-9 rounded-xl bg-[#2DC08A]/10 flex items-center justify-center shrink-0"
          >
            <Phone className="w-4 h-4 text-[#2DC08A]" />
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="pt-20 pb-40 max-w-[600px] mx-auto px-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start mb-2">
            <div className="bg-[#E55A26] rounded-2xl px-4 py-3 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F5F0E8] z-50">
        {/* Quick replies */}
        <div className="max-w-[600px] mx-auto px-4 pt-2 pb-0">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {QUICK_REPLIES.map((reply) => (
              <button
                key={reply}
                onClick={() => sendMessage(reply)}
                className="shrink-0 bg-white border border-[#E55A26]/20 text-[#E55A26] rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap hover:bg-[#FEF0E7] transition-colors"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>

        {/* Text input row */}
        <div className="max-w-[600px] mx-auto px-4 py-3 flex items-center gap-2">
          <button
            aria-label="Partager la position"
            className="w-9 h-9 rounded-xl bg-[#F5F0E8] flex items-center justify-center shrink-0"
          >
            <MapPin className="w-4 h-4 text-[#6B7A9E]" />
          </button>

          <div className="flex-1 bg-[#F5F0E8] rounded-2xl px-4 py-2.5 flex items-center">
            <input
              ref={inputRef}
              type="text"
              placeholder="Votre message…"
              className="flex-1 bg-transparent text-sm text-[#1B2440] placeholder:text-[#6B7A9E]/60 focus:outline-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button aria-label="Emoji" className="ml-2 shrink-0">
              <Smile className="w-4 h-4 text-[#6B7A9E]" />
            </button>
          </div>

          <button
            onClick={() => sendMessage()}
            aria-label="Envoyer"
            className="w-9 h-9 rounded-xl bg-[#E55A26] flex items-center justify-center shrink-0 disabled:opacity-50 transition-opacity"
            disabled={!input.trim()}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
