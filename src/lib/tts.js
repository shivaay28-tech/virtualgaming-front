/* Pre-recorded dealer voice clips with browser speechSynthesis fallback. */

import { mediaUrl } from "./media";

const SUPPORTED_LANGS = ["en", "hi", "gu", "mr"];

const HAND_SLUGS = {
  Trail: "trail",
  "Pure Sequence": "pure_sequence",
  Sequence: "sequence",
  Color: "color",
  Pair: "pair",
  "High Card": "high_card",
};

const PHRASES = {
  en: {
    betting: "Place your bets, please.",
    locked: "No more bets.",
    dealing: "Dealing the cards.",
    winner_a: "Player A wins with {hand}.",
    winner_b: "Player B wins with {hand}.",
    tie: "It's a tie. Main bets refunded.",
    paused: "The table is paused. Please stand by.",
    resumed: "Welcome back. Place your bets.",
  },
};

let muted = false;
let currentAudio = null;

try {
  muted = localStorage.getItem("tp_muted") === "1";
} catch (e) { /* ignore */ }

export function setDealerMuted(v) {
  muted = !!v;
  try {
    localStorage.setItem("tp_muted", muted ? "1" : "0");
  } catch (e) { /* ignore */ }
  if (muted && currentAudio) {
    try {
      currentAudio.pause();
    } catch (e) { /* ignore */ }
  }
  if (muted && typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function isDealerMuted() {
  return muted;
}

function normalizeLang(lang) {
  return SUPPORTED_LANGS.includes(lang) ? lang : "en";
}

function normalizeDealer(dealerId) {
  return dealerId || "ava";
}

function clipName(event, hand) {
  if (event === "winner_a" || event === "winner_b") {
    const slug = HAND_SLUGS[hand] || "high_card";
    return `${event}_${slug}`;
  }
  return event;
}

function clipUrl(dealerId, lang, event, hand) {
  const name = clipName(event, hand);
  return mediaUrl(`/audio/dealer/${normalizeDealer(dealerId)}/${normalizeLang(lang)}/${name}.mp3`);
}

function phraseText(event, lang, hand) {
  const l = normalizeLang(lang);
  const template = PHRASES[l]?.[event] || PHRASES.en[event] || "";
  if (!template) return "";
  if (hand && (event === "winner_a" || event === "winner_b")) {
    return template.replace("{hand}", hand);
  }
  return template;
}

function speakWithBrowser(text, lang) {
  if (!text || typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang =
      lang === "hi" ? "hi-IN" : lang === "gu" ? "gu-IN" : lang === "mr" ? "mr-IN" : "en-US";
    window.speechSynthesis.speak(utter);
  } catch (e) { /* ignore */ }
}

function playUrl(url, fallbackText, lang) {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    const audio = new Audio(url);
    currentAudio = audio;
    audio.addEventListener("error", () => {
      speakWithBrowser(fallbackText, lang);
    });
    audio.play().catch(() => {
      speakWithBrowser(fallbackText, lang);
    });
  } catch (e) {
    speakWithBrowser(fallbackText, lang);
  }
}

export function sayEvent(event, lang = "en", hand, dealerId = "ava") {
  if (muted) return;
  const text = phraseText(event, lang, hand);
  const url = clipUrl(dealerId, lang, event, hand);
  playUrl(url, text, lang);
}

export function sayText(text, lang = "en") {
  if (muted || !text) return;
  speakWithBrowser(text, lang);
}

/** Required to unlock audio on iOS Safari — call from a user gesture. */
export function unlockAudio() {
  try {
    const a = new Audio(mediaUrl("/audio/dealer/ava/en/betting.mp3"));
    a.volume = 0;
    a.play().catch(() => {
      const silent = new Audio(
        "data:audio/mp3;base64,SUQzAwAAAAAAJlRTU0UAAAAOAAADTGF2ZjU3LjQxLjEwMAA="
      );
      silent.volume = 0;
      silent.play().catch(() => { /* ignore */ });
    });
  } catch (e) { /* ignore */ }
}
