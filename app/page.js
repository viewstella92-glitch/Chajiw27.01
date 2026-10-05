"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Loader2,
  ArrowRight,
  Volume2,
  Star,
  X,
  GitBranch,
  BookMarked,
  Puzzle,
  Type,
  PenLine,
  Undo2,
  Eraser,
  Delete,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Link2,
  Sparkles,
  LayoutDashboard,
  Swords,
  Flame,
  PencilLine,
  HelpCircle,
  Check,
  XCircle,
  Scroll,
  Trophy,
  Target,
  Search,
  Cloud,
  CloudOff,
} from "lucide-react";
import { C, RANKS, rankFor, PATTERN_TAGS } from "../lib/theme";
import { cloudEnabled, loadCloudData, saveCloudData } from "../lib/cloud";

const TONE_COLORS = { 1: C.seal, 2: C.gold, 3: C.jade, 4: C.indigo, 5: C.muted };
const TONE_LABELS = {
  1: "เสียงที่ 1 · ราบ",
  2: "เสียงที่ 2 · ขึ้น",
  3: "เสียงที่ 3 · หัก",
  4: "เสียงที่ 4 · ตก",
  5: "เสียงเบา",
};
const ROLE_COLORS = {
  "ประธาน": C.indigo,
  "กริยาหลัก": C.seal,
  "กริยาช่วย": "#C9763F",
  "กรรม": C.jade,
  "ส่วนขยาย": C.plum,
  "ขยายเวลา/สถานที่": "#3C7A9E",
  "คำเชื่อม": C.muted,
  "อนุภาค": C.faint,
  "อื่นๆ": C.muted,
};
const CANVAS_SIZE = 260;
const EXAMPLE_SENTENCE = "我明天要去图书馆看书。";

const STORAGE_KEY = "parseit:saved-words";
const STATS_KEY = "parseit:stats";
const ACTIVITY_KEY = "parseit:activity";
const PATTERNS_KEY = "parseit:patterns";
const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60];
const DAILY_GOAL_DEFAULTS = { sentences: 1, newWords: 5, reviews: 10 };

function wordKey(w) {
  return `${w.hanzi}__${w.pinyin}`;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function daysBetween(isoA, isoB) {
  const a = new Date(isoA + "T00:00:00");
  const b = new Date(isoB + "T00:00:00");
  return Math.round((b - a) / 86400000);
}
function isDue(w) {
  if (!w.lastReviewed) return true;
  const n = Math.min(w.reviewCount || 0, REVIEW_INTERVALS.length - 1);
  return daysBetween(w.lastReviewed, todayStr()) >= REVIEW_INTERVALS[n];
}
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function saveJSON(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {}
}
function shuffleArray(n) {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function ToneMark({ tone }) {
  const color = TONE_COLORS[tone] || TONE_COLORS[5];
  const paths = { 1: "M3,4 L25,4", 2: "M3,11 L25,3", 3: "M3,6 Q14,15 25,3", 4: "M3,2 L25,12" };
  return (
    <svg width="28" height="16" viewBox="0 0 28 16" style={{ display: "block" }}>
      {tone === 5 ? (
        <circle cx="14" cy="8" r="2.2" fill={color} />
      ) : (
        <path d={paths[tone] || paths[1]} stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
}

function InkDivider() {
  return (
    <svg viewBox="0 0 400 14" style={{ width: "100%", height: "12px", display: "block" }} preserveAspectRatio="none">
      <path
        d="M2,7 C60,2 100,11 160,6 C220,1 260,10 340,5 C370,3 390,8 398,6"
        stroke={C.cardEdge}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

function pillStyle(active) {
  return {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 13px",
    borderRadius: "4px",
    border: `1px solid ${active ? C.sealDeep : C.cardEdge}`,
    background: active ? C.seal : C.card,
    color: active ? "#F6EFD9" : C.inkSoft,
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Noto Sans Thai', sans-serif",
  };
}

function tabStyle(active) {
  return {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "9px 14px",
    borderRadius: "4px 4px 0 0",
    border: `1px solid ${C.cardEdge}`,
    borderBottom: active ? `1px solid ${C.card}` : `1px solid ${C.cardEdge}`,
    background: active ? C.card : "transparent",
    color: active ? C.ink : C.inkSoft,
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Noto Sans Thai', sans-serif",
    marginBottom: "-1px",
  };
}

export default function ParseIt() {
  const [activeTab, setActiveTab] = useState("parse");

  const [inputMode, setInputMode] = useState("type");
  const [input, setInput] = useState("");
  const [translation, setTranslation] = useState("");
  const [pattern, setPattern] = useState("");
  const [patternTag, setPatternTag] = useState("");
  const [hsk, setHsk] = useState("");
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewWord, setPreviewWord] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const [savedWords, setSavedWords] = useState([]);
  const [savedLoaded, setSavedLoaded] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const [breakdowns, setBreakdowns] = useState({});

  const [flashOpen, setFlashOpen] = useState(false);
  const [flashOrder, setFlashOrder] = useState([]);
  const [flashIdx, setFlashIdx] = useState(0);
  const [flashFlipped, setFlashFlipped] = useState(false);

  const [stats, setStats] = useState({ totalSentences: 0 });
  const [activity, setActivity] = useState([]);
  const [patternCounts, setPatternCounts] = useState({});
  const [dailyStats, setDailyStats] = useState({ date: todayStr(), sentences: 0, newWords: 0, reviews: 0 });
  const [dailyGoals, setDailyGoals] = useState(DAILY_GOAL_DEFAULTS);
  const [hskFilter, setHskFilter] = useState("all");
  const [wordSearch, setWordSearch] = useState("");
  const [cloudStatus, setCloudStatus] = useState("loading");
  const [cloudHydrated, setCloudHydrated] = useState(false);

  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizSelected, setQuizSelected] = useState(null);
  const [quizScore, setQuizScore] = useState(0);

  const [practiceWord, setPracticeWord] = useState(null);
  const [practiceInput, setPracticeInput] = useState("");
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceResult, setPracticeResult] = useState(null);
  const [practiceError, setPracticeError] = useState("");

  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const strokesRef = useRef([]);
  const currentPointsRef = useRef([]);
  const drawingRef = useRef(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [recognizing, setRecognizing] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [recognizeError, setRecognizeError] = useState("");

  useEffect(() => {
    setSavedWords(loadJSON(STORAGE_KEY, []));
    setStats(loadJSON(STATS_KEY, { totalSentences: 0 }));
    setActivity(loadJSON(ACTIVITY_KEY, []));
    setPatternCounts(loadJSON(PATTERNS_KEY, {}));
    setDailyStats(loadJSON("parseit:daily-stats", { date: todayStr(), sentences: 0, newWords: 0, reviews: 0 }));
    setDailyGoals(loadJSON("parseit:daily-goals", DAILY_GOAL_DEFAULTS));
    setSavedLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cloudEnabled) {
        if (!cancelled) { setCloudStatus("local"); setCloudHydrated(true); }
        return;
      }
      try {
        const cloud = await loadCloudData();
        if (!cancelled && cloud) {
          const localWords = loadJSON(STORAGE_KEY, []);
          const mergedWords = [...(cloud.savedWords || [])];
          for (const w of localWords) {
            if (!mergedWords.some((x) => wordKey(x) === wordKey(w))) mergedWords.push(w);
          }
          const localStats = loadJSON(STATS_KEY, { totalSentences: 0 });
          const mergedStats = { totalSentences: Math.max(cloud.stats?.totalSentences || 0, localStats.totalSentences || 0) };
          const mergedActivity = Array.from(new Set([...(cloud.activity || []), ...loadJSON(ACTIVITY_KEY, [])]));
          const mergedPatterns = { ...(cloud.patternCounts || {}) };
          Object.entries(loadJSON(PATTERNS_KEY, {})).forEach(([k,v]) => { mergedPatterns[k] = Math.max(mergedPatterns[k] || 0, v); });
          setSavedWords(mergedWords); setStats(mergedStats); setActivity(mergedActivity); setPatternCounts(mergedPatterns);
          if (cloud.dailyStats) setDailyStats(cloud.dailyStats);
          if (cloud.dailyGoals) setDailyGoals(cloud.dailyGoals);
          saveJSON(STORAGE_KEY, mergedWords); saveJSON(STATS_KEY, mergedStats); saveJSON(ACTIVITY_KEY, mergedActivity); saveJSON(PATTERNS_KEY, mergedPatterns);
        }
        if (!cancelled) setCloudStatus("online");
      } catch (e) {
        if (!cancelled) setCloudStatus("error");
      } finally {
        if (!cancelled) setCloudHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!cloudHydrated) return;
    saveJSON("parseit:daily-stats", dailyStats);
    saveJSON("parseit:daily-goals", dailyGoals);
    if (!cloudEnabled) return;
    const timer = setTimeout(async () => {
      try {
        await saveCloudData({ savedWords, stats, activity, patternCounts, dailyStats, dailyGoals });
        setCloudStatus("online");
      } catch (e) { setCloudStatus("error"); }
    }, 400);
    return () => clearTimeout(timer);
  }, [cloudHydrated, savedWords, stats, activity, patternCounts, dailyStats, dailyGoals]);

  function persistSaved(list) {
    setSavedWords(list);
    saveJSON(STORAGE_KEY, list);
  }
  function bumpDaily(field) {
    const t = todayStr();
    setDailyStats((prev) => {
      const base = prev.date === t ? prev : { date: t, sentences: 0, newWords: 0, reviews: 0 };
      return { ...base, [field]: (base[field] || 0) + 1 };
    });
  }

  function isSaved(w) {
    return savedWords.some((s) => wordKey(s) === wordKey(w));
  }

  function toggleSave(w) {
    if (isSaved(w)) {
      persistSaved(savedWords.filter((s) => wordKey(s) !== wordKey(w)));
    } else {
      persistSaved([...savedWords, { ...w, reviewCount: 0, lastReviewed: null, savedAt: todayStr() }]);
      bumpDaily("newWords");
    }
  }

  function removeSaved(w) {
    persistSaved(savedWords.filter((s) => wordKey(s) !== wordKey(w)));
  }

  function markReviewed(w) {
    const next = savedWords.map((s) =>
      wordKey(s) === wordKey(w)
        ? { ...s, reviewCount: (s.reviewCount || 0) + 1, lastReviewed: todayStr() }
        : s
    );
    persistSaved(next);
    bumpDaily("reviews");
  }

  function startFlashcards(dueOnly) {
    const pool = dueOnly ? savedWords.filter(isDue) : savedWords;
    if (pool.length === 0) return;
    const order = shuffleArray(pool.length).map((i) => savedWords.indexOf(pool[i]));
    setFlashOrder(order);
    setFlashIdx(0);
    setFlashFlipped(false);
    setFlashOpen(true);
  }
  function shuffleFlash() {
    setFlashOrder(shuffleArray(savedWords.length));
    setFlashIdx(0);
    setFlashFlipped(false);
  }
  function nextCard() {
    setFlashFlipped(false);
    setFlashIdx((i) => (flashOrder.length ? (i + 1) % flashOrder.length : 0));
  }
  function prevCard() {
    setFlashFlipped(false);
    setFlashIdx((i) => (flashOrder.length ? (i - 1 + flashOrder.length) % flashOrder.length : 0));
  }
  function closeFlash() {
    setFlashOpen(false);
  }
  function flipFlash() {
    setFlashFlipped((f) => {
      const next = !f;
      if (next && flashWord) markReviewed(flashWord);
      return next;
    });
  }
  const flashWord = flashOpen && flashOrder.length > 0 ? savedWords[flashOrder[flashIdx]] : null;

  // ---- canvas (handwriting) ----
  function drawGrid(ctx) {
    ctx.save();
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.fillStyle = "#FBF6E8";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.strokeStyle = C.cardEdge;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, CANVAS_SIZE - 2, CANVAS_SIZE - 2);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#E3D6AC";
    ctx.beginPath();
    ctx.moveTo(CANVAS_SIZE / 2, 0);
    ctx.lineTo(CANVAS_SIZE / 2, CANVAS_SIZE);
    ctx.moveTo(0, CANVAS_SIZE / 2);
    ctx.lineTo(CANVAS_SIZE, CANVAS_SIZE / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  function drawStrokePath(ctx, points) {
    if (!points || points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
  }
  function redrawAll(strokesArr) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    drawGrid(ctx);
    strokesArr.forEach((s) => drawStrokePath(ctx, s));
  }
  useEffect(() => {
    if (inputMode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    canvas.style.width = CANVAS_SIZE + "px";
    canvas.style.height = CANVAS_SIZE + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 7;
    ctx.strokeStyle = C.ink;
    ctxRef.current = ctx;
    redrawAll(strokesRef.current);
  }, [inputMode]);

  function getPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function handlePointerDown(e) {
    e.preventDefault();
    const canvas = canvasRef.current;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) {}
    const { x, y } = getPos(e);
    drawingRef.current = true;
    currentPointsRef.current = [{ x, y }];
    const ctx = ctxRef.current;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function handlePointerMove(e) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    currentPointsRef.current.push({ x, y });
    const ctx = ctxRef.current;
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  function handlePointerUp() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (currentPointsRef.current.length > 1) {
      strokesRef.current = [...strokesRef.current, currentPointsRef.current];
      setStrokeCount(strokesRef.current.length);
    }
    currentPointsRef.current = [];
  }
  function undoStroke() {
    strokesRef.current = strokesRef.current.slice(0, -1);
    setStrokeCount(strokesRef.current.length);
    redrawAll(strokesRef.current);
    setCandidates([]);
    setRecognizeError("");
  }
  function clearCanvas() {
    strokesRef.current = [];
    setStrokeCount(0);
    redrawAll([]);
    setCandidates([]);
    setRecognizeError("");
  }
  function getStrokesBoundingBox(strokes) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    strokes.forEach((s) => s.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }));
    return { minX, minY, maxX, maxY };
  }
  function buildRecognitionImage() {
    const strokes = strokesRef.current;
    if (strokes.length === 0) return null;
    const { minX, minY, maxX, maxY } = getStrokesBoundingBox(strokes);
    const pad = 20;
    const bx0 = minX - pad, by0 = minY - pad, bx1 = maxX + pad, by1 = maxY + pad;
    const side = Math.max(bx1 - bx0, by1 - by0, 1);
    const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2;
    const half = side / 2;
    const sx0 = cx - half, sy0 = cy - half;
    const OUT = 400;
    const off = document.createElement("canvas");
    off.width = OUT;
    off.height = OUT;
    const octx = off.getContext("2d");
    octx.fillStyle = "#FFFFFF";
    octx.fillRect(0, 0, OUT, OUT);
    octx.lineCap = "round";
    octx.lineJoin = "round";
    octx.strokeStyle = "#000000";
    octx.lineWidth = 16;
    const scale = OUT / side;
    strokes.forEach((s) => {
      if (s.length < 2) return;
      octx.beginPath();
      s.forEach((p, i) => {
        const x = (p.x - sx0) * scale, y = (p.y - sy0) * scale;
        if (i === 0) octx.moveTo(x, y);
        else octx.lineTo(x, y);
      });
      octx.stroke();
    });
    return off.toDataURL("image/png");
  }
  async function recognizeCanvas() {
    if (strokesRef.current.length === 0) return;
    setRecognizing(true);
    setRecognizeError("");
    try {
      const dataUrl = buildRecognitionImage();
      if (!dataUrl) return;
      const base64 = dataUrl.split(",")[1];
      const res = await fetch("/api/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      const parsed = await res.json();
      if (parsed.error) throw new Error(parsed.error);
      setCandidates(Array.isArray(parsed.candidates) ? parsed.candidates.slice(0, 5) : []);
    } catch (e) {
      setRecognizeError("ทายตัวอักษรไม่สำเร็จ ลองวาดใหม่อีกครั้ง");
    } finally {
      setRecognizing(false);
    }
  }
  function pickCandidate(c) {
    setInput((prev) => prev + c.hanzi);
    clearCanvas();
  }
  function backspaceChar() {
    setInput((prev) => Array.from(prev).slice(0, -1).join(""));
  }
  // ---- end canvas ----

  async function segment(sentence) {
    const text = sentence.trim();
    if (!text) return;
    setLoading(true);
    setError("");
    setWords([]);
    setTranslation("");
    setPattern("");
    setPatternTag("");
    setHsk("");
    setPreviewWord(null);
    setRevealed(false);

    const cacheKey = "parseit-cache:segment:" + text;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setTranslation(parsed.translation || "");
        setPattern(parsed.pattern || "");
        setPatternTag(parsed.patternTag || "");
        setHsk(parsed.hsk || "");
        setWords(Array.isArray(parsed.words) ? parsed.words : []);
        setTimeout(() => setRevealed(true), 30);
        setLoading(false);
        return;
      }
    } catch (e) {}

    try {
      const res = await fetch("/api/segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const parsed = await res.json();
      if (parsed.error) throw new Error(parsed.error);
      setTranslation(parsed.translation || "");
      setPattern(parsed.pattern || "");
      setPatternTag(parsed.patternTag || "");
      setHsk(parsed.hsk || "");
      setWords(Array.isArray(parsed.words) ? parsed.words : []);
      setTimeout(() => setRevealed(true), 30);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(parsed));
      } catch (e) {}

      const nextStats = { totalSentences: (stats.totalSentences || 0) + 1 };
      bumpDaily("sentences");
      setStats(nextStats);
      saveJSON(STATS_KEY, nextStats);

      const today = todayStr();
      if (!activity.includes(today)) {
        const nextActivity = [...activity, today];
        setActivity(nextActivity);
        saveJSON(ACTIVITY_KEY, nextActivity);
      }

      const tag = PATTERN_TAGS.includes(parsed.patternTag) ? parsed.patternTag : "อื่นๆ";
      const nextCounts = { ...patternCounts, [tag]: (patternCounts[tag] || 0) + 1 };
      setPatternCounts(nextCounts);
      saveJSON(PATTERNS_KEY, nextCounts);
    } catch (e) {
      setError("แยกคำไม่สำเร็จ: " + (e?.message || "เกิดข้อผิดพลาดไม่ทราบสาเหตุ"));
    } finally {
      setLoading(false);
    }
  }

  async function loadBreakdown(w) {
    const key = wordKey(w);
    if (breakdowns[key]) return;
    const cacheKey = "parseit-cache:breakdown:" + key;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setBreakdowns((prev) => ({ ...prev, [key]: { status: "done", chars: JSON.parse(cached) } }));
        return;
      }
    } catch (e) {}
    setBreakdowns((prev) => ({ ...prev, [key]: { status: "loading", chars: [] } }));
    try {
      const res = await fetch("/api/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hanzi: w.hanzi, pinyin: w.pinyin }),
      });
      const parsed = await res.json();
      if (parsed.error) throw new Error(parsed.error);
      const chars = Array.isArray(parsed.chars) ? parsed.chars : [];
      setBreakdowns((prev) => ({ ...prev, [key]: { status: "done", chars } }));
      try {
        localStorage.setItem(cacheKey, JSON.stringify(chars));
      } catch (e) {}
    } catch (e) {
      setBreakdowns((prev) => ({ ...prev, [key]: { status: "error", chars: [] } }));
    }
  }
  function openPreview(w) {
    const key = wordKey(w);
    const isSame = previewWord && wordKey(previewWord) === key;
    if (isSame) {
      setPreviewWord(null);
      return;
    }
    setPreviewWord(w);
    if (!breakdowns[key]) loadBreakdown(w);
  }

  // ---- quiz ----
  function generateQuiz() {
    if (savedWords.length < 4) return;
    const qCount = Math.min(8, savedWords.length);
    const order = shuffleArray(savedWords.length).slice(0, qCount);
    const questions = order.map((idx) => {
      const correct = savedWords[idx];
      const others = savedWords.filter((_, i) => i !== idx);
      const distractorIdx = shuffleArray(others.length).slice(0, 3);
      const distractors = distractorIdx.map((i) => others[i]);
      const optionPool = shuffleArray(4);
      const options = new Array(4);
      let correctPos = -1;
      [correct, ...distractors].forEach((w, orig) => {
        const pos = optionPool[orig];
        options[pos] = w;
        if (orig === 0) correctPos = pos;
      });
      const promptType = Math.random() < 0.5 ? "hanzi" : "meaning";
      return { word: correct, options, correctIndex: correctPos, promptType };
    });
    setQuizQuestions(questions);
    setQuizIdx(0);
    setQuizSelected(null);
    setQuizScore(0);
  }
  function answerQuiz(i) {
    if (quizSelected !== null) return;
    setQuizSelected(i);
    if (i === quizQuestions[quizIdx].correctIndex) setQuizScore((s) => s + 1);
  }
  function nextQuiz() {
    setQuizSelected(null);
    setQuizIdx((i) => i + 1);
  }

  // ---- practice ----
  function pickPracticeWord() {
    if (savedWords.length === 0) return;
    const w = savedWords[Math.floor(Math.random() * savedWords.length)];
    setPracticeWord(w);
    setPracticeInput("");
    setPracticeResult(null);
    setPracticeError("");
  }
  async function submitPractice() {
    if (!practiceWord || !practiceInput.trim()) return;
    setPracticeLoading(true);
    setPracticeError("");
    setPracticeResult(null);
    try {
      const res = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetWord: practiceWord.hanzi, sentence: practiceInput.trim() }),
      });
      const parsed = await res.json();
      if (parsed.error) throw new Error(parsed.error);
      setPracticeResult(parsed);
    } catch (e) {
      setPracticeError("ตรวจไม่สำเร็จ: " + (e?.message || "เกิดข้อผิดพลาด"));
    } finally {
      setPracticeLoading(false);
    }
  }

  const rolesInSentence = Array.from(new Set(words.map((w) => w.role))).filter((r) => ROLE_COLORS[r]);
  const activeBreakdown = previewWord ? breakdowns[wordKey(previewWord)] : null;

  const { current: rank, next: nextRank } = rankFor(savedWords.length);
  const rankProgress = nextRank ? Math.min(1, (savedWords.length - rank.min) / (nextRank.min - rank.min)) : 1;
  const dueWords = savedWords.filter(isDue);
  const filteredSavedWords = savedWords.filter((w) => {
    const q = wordSearch.trim().toLowerCase();
    const textOk = !q || [w.hanzi, w.pinyin, w.thai].some((v) => String(v || "").toLowerCase().includes(q));
    const hskOk = hskFilter === "all" || String(w.hsk || "unknown") === hskFilter;
    return textOk && hskOk;
  });
  const todayDaily = dailyStats.date === todayStr() ? dailyStats : { date: todayStr(), sentences: 0, newWords: 0, reviews: 0 };
  const goalItems = [
    { key: "sentences", label: "วิเคราะห์ 1 ประโยค", value: todayDaily.sentences, target: dailyGoals.sentences, icon: Scroll },
    { key: "newWords", label: "เพิ่มคำศัพท์", value: todayDaily.newWords, target: dailyGoals.newWords, icon: BookMarked },
    { key: "reviews", label: "ทบทวนคำศัพท์", value: todayDaily.reviews, target: dailyGoals.reviews, icon: GraduationCap },
  ];
  const dailyComplete = goalItems.every((g) => g.value >= g.target);
  const achievements = [
    { id: "first", title: "ก้าวแรกในยุทธภพ", desc: "วิเคราะห์ประโยคแรก", icon: "⚔️", unlocked: stats.totalSentences >= 1 },
    { id: "words10", title: "ศิษย์ใหม่", desc: "สะสม 10 คำ", icon: "🗡️", unlocked: savedWords.length >= 10 },
    { id: "words50", title: "ผู้รู้ถ้อยคำ", desc: "สะสม 50 คำ", icon: "🏮", unlocked: savedWords.length >= 50 },
    { id: "words100", title: "คลังร้อยคำ", desc: "สะสม 100 คำ", icon: "👑", unlocked: savedWords.length >= 100 },
    { id: "streak7", title: "เจ็ดวันไม่ขาด", desc: "เรียนต่อเนื่อง 7 วัน", icon: "🔥", unlocked: streak >= 7 },
    { id: "sent100", title: "อ่านตำราร้อยบท", desc: "วิเคราะห์ 100 ประโยค", icon: "📜", unlocked: stats.totalSentences >= 100 },
    { id: "daily", title: "功成 · ภารกิจสำเร็จ", desc: "ทำเป้าหมายวันนี้ครบ", icon: "🏯", unlocked: dailyComplete },
  ];

  // streak: consecutive days up to today present in activity
  let streak = 0;
  {
    let d = new Date();
    for (;;) {
      const iso = d.toISOString().slice(0, 10);
      if (activity.includes(iso)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
  }

  // last 84 days heatmap
  const heatDays = [];
  {
    const d = new Date();
    for (let i = 83; i >= 0; i--) {
      const dd = new Date(d);
      dd.setDate(d.getDate() - i);
      heatDays.push(dd.toISOString().slice(0, 10));
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at 50% -10%, rgba(184,145,62,0.12), transparent 38%), linear-gradient(180deg, #F7F0DE 0%, #F2E9D1 100%)", fontFamily: "'Noto Sans Thai', 'Inter', sans-serif", color: C.ink }}>
      <style>{`
        body { background: ${C.parchment}; }
        .cj-textarea::placeholder { color: ${C.faint}; }
        .cj-word:hover { transform: translateY(-2px); }
        .cj-word { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .cj-star:hover { transform: scale(1.15); }
        .cj-canvas { touch-action: none; cursor: crosshair; border-radius: 4px; }
        .cj-opt:hover { filter: brightness(1.03); }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "32px 20px 64px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{
              width: "54px", height: "54px", borderRadius: "4px", background: C.seal, color: "#F6EFD9",
              display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Noto Serif SC', serif",
              fontSize: "27px", fontWeight: 900, transform: "rotate(-3deg)",
              boxShadow: `0 3px 0 ${C.sealDeep}, 0 3px 6px rgba(0,0,0,0.25)`, flexShrink: 0,
              border: "2px solid rgba(255,255,255,0.25)",
            }}>
              拆
            </div>
            <div>
              <h1 style={{ fontFamily: "'Noto Serif Thai', serif", fontSize: "25px", fontWeight: 700, margin: 0, color: C.ink }}>
                拆句 江湖 <span style={{ color: C.muted, fontWeight: 500, fontSize: "15px", fontFamily: "'Noto Sans Thai', sans-serif" }}>· ตำรับยุทธ์แยกประโยคจีน</span>
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: "13.5px", color: C.inkSoft }}>
                ฝึกวรยุทธ์ภาษาจีน แยกคำ จดจำศัพท์ ก้าวสู่ขั้นภูมิที่สูงขึ้น
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: cloudStatus === "online" ? C.jade : C.inkSoft }}>
              {cloudStatus === "online" ? <Cloud size={13} /> : <CloudOff size={13} />}
              {cloudStatus === "online" ? "บันทึกออนไลน์" : cloudStatus === "local" ? "เก็บในเครื่อง" : cloudStatus === "error" ? "ซิงก์มีปัญหา" : "กำลังเชื่อมต่อ"}
            </div>
            <button onClick={() => setShowSaved((s) => !s)} style={sealBtnOutline(showSaved)}>
            <BookMarked size={15} />
            ตำราคำศัพท์ {savedLoaded ? `(${savedWords.length})` : ""}
          </button>
        </div>

        {showSaved && (
          <div style={cardBox()}>
            {!savedLoaded ? (
              <div style={{ fontSize: "13.5px", color: C.inkSoft }}>กำลังโหลด…</div>
            ) : savedWords.length === 0 ? (
              <div style={{ fontSize: "13.5px", color: C.inkSoft }}>ยังไม่มีคำศัพท์ที่บันทึกไว้ — กดรูปดาวบนการ์ดคำเพื่อบันทึก</div>
            ) : (
              <>
                <button onClick={() => startFlashcards(false)} style={{ ...sealBtnFilled(), marginBottom: "12px" }}>
                  <GraduationCap size={15} /> เล่นแฟลชการ์ด ({savedWords.length} คำ)
                </button>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <div style={{ position: "relative", flex: "1 1 220px" }}>
                      <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: C.faint }} />
                      <input value={wordSearch} onChange={(e) => setWordSearch(e.target.value)} placeholder="ค้นหาคำศัพท์ / pinyin / ความหมาย"
                        style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px 8px 30px", border: "1px solid #D8C99F", borderRadius: 4, background: "#FBF6E8", color: C.ink }} />
                    </div>
                    <select value={hskFilter} onChange={(e) => setHskFilter(e.target.value)} style={{ border: "1px solid #D8C99F", borderRadius: 4, background: "#FBF6E8", color: C.ink, padding: "8px 10px" }}>
                      <option value="all">ทุกระดับ HSK</option>
                      {[1,2,3,4,5,6].map((n) => <option key={n} value={String(n)}>HSK {n}</option>)}
                      <option value="unknown">ยังไม่ระบุ HSK</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  {filteredSavedWords.map((w, i) => (
                    <div key={wordKey(w) + i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "9px 4px", borderBottom: i < savedWords.length - 1 ? `1px solid ${C.cardEdge}` : "none", cursor: "pointer" }} onClick={() => openPreview(w)}>
                      <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: "19px", minWidth: "44px" }}>{w.hanzi}</div>
                      <ToneMark tone={w.tone} />
                      <div style={{ fontSize: "14px", color: TONE_COLORS[w.tone] || TONE_COLORS[5], minWidth: "70px" }}>{w.pinyin}</div>
                      <div style={{ fontSize: "13.5px", color: C.inkSoft, flex: 1 }}>{w.thai}</div>
                      {w.hsk && <span style={{ fontSize: "10px", color: C.indigo, border: "1px solid " + C.indigo, padding: "2px 5px", borderRadius: 3 }}>HSK {w.hsk}</span>}
                      {isDue(w) && <span style={{ fontSize: "10px", color: C.seal, fontWeight: 700 }}>●ครบทบทวน</span>}
                      <button onClick={(e) => { e.stopPropagation(); removeSaved(w); }} style={{ background: "none", border: "none", color: C.faint, cursor: "pointer", padding: "4px", display: "flex" }} aria-label={`ลบ ${w.hanzi}`}>
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", marginTop: "26px", borderBottom: `1px solid ${C.cardEdge}`, flexWrap: "wrap" }}>
          <button onClick={() => setActiveTab("parse")} style={tabStyle(activeTab === "parse")}><Scroll size={14} />แยกคำ</button>
          <button onClick={() => setActiveTab("dashboard")} style={tabStyle(activeTab === "dashboard")}><LayoutDashboard size={14} />แดชบอร์ด</button>
          <button onClick={() => setActiveTab("jianghu")} style={tabStyle(activeTab === "jianghu")}><Trophy size={14} />ยุทธภพ</button>
          <button onClick={() => setActiveTab("quiz")} style={tabStyle(activeTab === "quiz")}><HelpCircle size={14} />ควิซ</button>
          <button onClick={() => setActiveTab("practice")} style={tabStyle(activeTab === "practice")}><PencilLine size={14} />ฝึกแต่งประโยค</button>
        </div>

        {activeTab === "parse" && (
          <div style={{ marginTop: "20px" }}>
            <div style={cardBox()}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                <button onClick={() => setInputMode("type")} style={pillStyle(inputMode === "type")}><Type size={14} />พิมพ์</button>
                <button onClick={() => setInputMode("draw")} style={pillStyle(inputMode === "draw")}><PenLine size={14} />วาด</button>
              </div>

              {inputMode === "type" ? (
                <textarea className="cj-textarea" value={input} onChange={(e) => setInput(e.target.value)} placeholder="พิมพ์ประโยคภาษาจีน เช่น 我明天要去图书馆看书。" rows={2}
                  style={{ width: "100%", border: "none", outline: "none", resize: "none", fontFamily: "'Noto Serif SC', serif", fontSize: "21px", lineHeight: 1.6, background: "transparent", color: C.ink }} />
              ) : (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#FBF6E8", border: `1px solid ${C.cardEdge}`, borderRadius: "4px", padding: "10px 12px", marginBottom: "14px", minHeight: "44px" }}>
                    <div style={{ flex: 1, fontFamily: "'Noto Serif SC', serif", fontSize: "19px", color: input ? C.ink : C.faint, wordBreak: "break-all" }}>
                      {input || "ประโยคที่กำลังวาดจะขึ้นตรงนี้…"}
                    </div>
                    {input && (
                      <button onClick={backspaceChar} aria-label="ลบตัวอักษรล่าสุด" style={{ background: "none", border: "none", color: C.inkSoft, cursor: "pointer", padding: "4px", display: "flex", flexShrink: 0 }}>
                        <Delete size={17} />
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <canvas ref={canvasRef} className="cj-canvas" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                    <button onClick={recognizeCanvas} disabled={strokeCount === 0 || recognizing} style={{ display: "flex", alignItems: "center", gap: "6px", background: strokeCount === 0 ? C.faint : C.seal, color: "#F6EFD9", border: "none", borderRadius: "4px", padding: "7px 14px", fontSize: "12.5px", fontWeight: 600, cursor: strokeCount === 0 || recognizing ? "default" : "pointer" }}>
                      <Sparkles size={13} />ทายตัวอักษร
                    </button>
                    <button onClick={undoStroke} disabled={strokeCount === 0} style={{ display: "flex", alignItems: "center", gap: "5px", background: C.card, border: `1px solid ${C.cardEdge}`, borderRadius: "4px", padding: "6px 11px", fontSize: "12.5px", color: strokeCount === 0 ? C.faint : C.inkSoft, cursor: strokeCount === 0 ? "default" : "pointer" }}>
                      <Undo2 size={13} />ย้อนขีดล่าสุด
                    </button>
                    <button onClick={clearCanvas} disabled={strokeCount === 0} style={{ display: "flex", alignItems: "center", gap: "5px", background: C.card, border: `1px solid ${C.cardEdge}`, borderRadius: "4px", padding: "6px 11px", fontSize: "12.5px", color: strokeCount === 0 ? C.faint : C.inkSoft, cursor: strokeCount === 0 ? "default" : "pointer" }}>
                      <Eraser size={13} />ลบทั้งหมด
                    </button>
                  </div>
                  <div style={{ marginTop: "16px", minHeight: "70px" }}>
                    {recognizing && (
                      <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "13px", color: C.inkSoft, justifyContent: "center" }}>
                        <Loader2 size={14} style={{ animation: "spin 0.9s linear infinite" }} />กำลังทายว่าเขียนตัวไหนอยู่…
                      </div>
                    )}
                    {!recognizing && recognizeError && <div style={{ textAlign: "center", fontSize: "12.5px", color: C.seal }}>{recognizeError}</div>}
                    {!recognizing && !recognizeError && candidates.length === 0 && (
                      <div style={{ textAlign: "center", fontSize: "12.5px", color: C.faint }}>
                        วาดตัวอักษรแล้วกด "ทายตัวอักษร" เพื่อดูตัวเลือก
                        {strokeCount > 0 && (
                          <div style={{ marginTop: "4px" }}>
                            ทายไม่ออก? ลองวาดให้ใหญ่และชัดขึ้น หรือสลับไปโหมด{" "}
                            <button onClick={() => setInputMode("type")} style={{ background: "none", border: "none", color: C.indigo, textDecoration: "underline", cursor: "pointer", fontSize: "12.5px", padding: 0 }}>พิมพ์</button>{" "}แทนได้เลย
                          </div>
                        )}
                      </div>
                    )}
                    {!recognizing && candidates.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
                        {candidates.map((c, i) => (
                          <button key={i} onClick={() => pickCandidate(c)} style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#FBF6E8", border: `1px solid ${C.cardEdge}`, borderRadius: "4px", padding: "8px 12px", cursor: "pointer", minWidth: "64px" }}>
                            <span style={{ fontFamily: "'Noto Serif SC', serif", fontSize: "22px" }}>{c.hanzi}</span>
                            <span style={{ fontSize: "11px", color: C.indigo, marginTop: "2px" }}>{c.pinyin}</span>
                            <span style={{ fontSize: "10px", color: C.inkSoft }}>{c.meaning}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px", gap: "12px", flexWrap: "wrap" }}>
                {inputMode === "type" ? (
                  <button onClick={() => setInput(EXAMPLE_SENTENCE)} style={{ background: "none", border: "none", color: C.inkSoft, fontSize: "13px", cursor: "pointer", padding: "4px 0", textDecoration: "underline" }}>
                    ลองตัวอย่าง: {EXAMPLE_SENTENCE}
                  </button>
                ) : <span />}
                <button onClick={() => segment(input)} disabled={loading || !input.trim()} style={{ display: "flex", alignItems: "center", gap: "8px", background: !input.trim() ? C.faint : C.indigo, color: "#F6EFD9", border: "none", borderRadius: "4px", padding: "10px 18px", fontSize: "14.5px", fontWeight: 600, cursor: !input.trim() || loading ? "default" : "pointer" }}>
                  {loading ? (<><Loader2 size={16} style={{ animation: "spin 0.9s linear infinite" }} />กำลังแยกคำ</>) : (<>แยกคำ <ArrowRight size={16} /></>)}
                </button>
              </div>
            </div>

            {error && <p style={{ color: C.seal, fontSize: "14px", marginTop: "12px" }}>{error}</p>}

            {translation && (
              <div style={{ marginTop: "22px", opacity: revealed ? 1 : 0, transition: "opacity 0.4s ease" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ fontSize: "17px", fontWeight: 500, paddingLeft: "14px", borderLeft: `3px solid ${C.seal}`, flex: 1 }}>{translation}</div>
                  {hsk && <span style={{ fontSize: "11px", fontWeight: 700, background: C.gold, color: "#2A2110", padding: "3px 9px", borderRadius: "3px", whiteSpace: "nowrap" }}>HSK {hsk}</span>}
                </div>
              </div>
            )}

            {pattern && (
              <div style={{ marginTop: "14px", paddingLeft: "14px", borderLeft: `3px solid ${C.indigo}`, opacity: revealed ? 1 : 0, transition: "opacity 0.4s ease 0.08s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: C.inkSoft, marginBottom: "4px", flexWrap: "wrap" }}>
                  <GitBranch size={12} />โครงสร้างไวยากรณ์
                  {patternTag && <span style={{ background: C.card, border: `1px solid ${C.cardEdge}`, borderRadius: "3px", padding: "1px 7px", fontSize: "10.5px" }}>{patternTag}</span>}
                </div>
                <div style={{ fontSize: "14.5px", color: C.ink, lineHeight: 1.6 }}>{pattern}</div>
              </div>
            )}

            {words.length > 0 && (
              <div style={{ marginTop: "18px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "2px", opacity: revealed ? 1 : 0, transition: "opacity 0.4s ease 0.12s" }}>
                {words.map((w, i) => (
                  <React.Fragment key={i}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", padding: "5px 9px", borderRadius: "4px", background: C.card, border: `1px solid ${ROLE_COLORS[w.role] || C.cardEdge}` }}>
                      <span style={{ fontFamily: "'Noto Serif SC', serif", fontSize: "14px" }}>{w.hanzi}</span>
                      <span style={{ fontSize: "9.5px", color: ROLE_COLORS[w.role] || C.inkSoft, fontWeight: 600 }}>{w.role || "—"}</span>
                    </div>
                    {i < words.length - 1 && <span style={{ color: C.faint, fontSize: "13px", padding: "0 2px" }}>→</span>}
                  </React.Fragment>
                ))}
              </div>
            )}

            {words.length > 0 && (
              <div style={{ marginTop: "22px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {words.map((w, i) => {
                  const isActive = previewWord && wordKey(previewWord) === wordKey(w);
                  const saved = isSaved(w);
                  const roleColor = ROLE_COLORS[w.role] || C.cardEdge;
                  return (
                    <div key={i} className="cj-word" style={{ position: "relative", opacity: revealed ? 1 : 0, transition: `opacity 0.4s ease ${i * 40}ms, transform 0.15s ease`, background: isActive ? C.ink : C.card, border: `1px solid ${isActive ? C.ink : C.cardEdge}`, borderTop: `3px solid ${roleColor}`, borderRadius: "4px", minWidth: "96px", boxShadow: isActive ? `0 4px 0 rgba(33,30,26,0.25)` : `0 1px 0 ${C.cardEdge}` }}>
                      <button className="cj-star" onClick={() => toggleSave(w)} aria-label={saved ? `เอา ${w.hanzi} ออก` : `บันทึก ${w.hanzi}`} style={{ position: "absolute", top: "5px", right: "5px", background: "none", border: "none", cursor: "pointer", padding: "3px", display: "flex" }}>
                        <Star size={14} fill={saved ? C.seal : "none"} color={saved ? C.seal : isActive ? C.faint : C.cardEdge} />
                      </button>
                      <button onClick={() => openPreview(w)} style={{ background: "none", border: "none", cursor: "pointer", width: "100%", padding: "13px 16px 12px", textAlign: "center" }}>
                        <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: "26px", fontWeight: 700, color: isActive ? "#F6EFD9" : C.ink }}>{w.hanzi}</div>
                        <div style={{ display: "flex", justifyContent: "center", margin: "4px 0 2px" }}><ToneMark tone={w.tone} /></div>
                        <div style={{ fontSize: "15px", fontWeight: 500, color: isActive ? "#F6EFD9" : TONE_COLORS[w.tone] || TONE_COLORS[5] }}>{w.pinyin}</div>
                        <div style={{ fontSize: "13.5px", marginTop: "4px", color: isActive ? "#D9CBA0" : C.inkSoft }}>{w.thai}</div>
                        {w.pos && <div style={{ fontSize: "10.5px", marginTop: "5px", color: isActive ? C.faint : C.muted }}>{w.pos}</div>}
                        {w.role && <div style={{ fontSize: "10px", marginTop: "3px", fontWeight: 600, color: roleColor }}>{w.role}</div>}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {rolesInSentence.length > 0 && (
              <div style={{ opacity: revealed ? 1 : 0, transition: "opacity 0.5s ease 0.3s", marginTop: "20px", display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "12px", color: C.inkSoft }}>
                {rolesInSentence.map((r) => (
                  <div key={r} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ width: "9px", height: "9px", borderRadius: "2px", background: ROLE_COLORS[r], display: "inline-block" }} />{r}
                  </div>
                ))}
              </div>
            )}

            {previewWord && (
              <div style={cardBox({ marginTop: "22px", padding: "18px 20px" })}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: C.inkSoft, marginBottom: "10px" }}>
                  <Volume2 size={13} />ตัวอย่างประโยคของ「{previewWord.hanzi}」
                </div>
                <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: "19px", marginBottom: "4px" }}>{previewWord.example?.hanzi}</div>
                <div style={{ fontSize: "14.5px", color: C.indigo, marginBottom: "4px" }}>{previewWord.example?.pinyin}</div>
                <div style={{ fontSize: "14.5px", color: C.inkSoft }}>{previewWord.example?.thai}</div>
                <div style={{ margin: "16px 0" }}><InkDivider /></div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: C.inkSoft, marginBottom: "12px" }}>
                  <Puzzle size={13} />ส่วนประกอบตัวอักษรของ「{previewWord.hanzi}」
                </div>
                {(!activeBreakdown || activeBreakdown.status === "loading") && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px", color: C.inkSoft }}>
                    <Loader2 size={14} style={{ animation: "spin 0.9s linear infinite" }} />กำลังแยกส่วนประกอบ…
                  </div>
                )}
                {activeBreakdown?.status === "error" && (
                  <div style={{ fontSize: "13.5px", color: C.seal }}>
                    แยกส่วนประกอบไม่สำเร็จ{" "}
                    <button onClick={() => loadBreakdown(previewWord)} style={{ background: "none", border: "none", color: C.indigo, textDecoration: "underline", cursor: "pointer", fontSize: "13.5px", padding: 0 }}>ลองใหม่</button>
                  </div>
                )}
                {activeBreakdown?.status === "done" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {activeBreakdown.chars.map((c, ci) => (
                      <div key={ci}>
                        <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                          <div style={{ flexShrink: 0, width: "56px", textAlign: "center", background: "#FBF6E8", border: `1px solid ${C.cardEdge}`, borderRadius: "4px", padding: "8px 4px" }}>
                            <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: "24px" }}>{c.hanzi}</div>
                            <div style={{ fontSize: "11.5px", color: C.indigo, marginTop: "2px" }}>{c.pinyin}</div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "13.5px", color: C.ink, marginBottom: "6px" }}>{c.meaning}</div>
                            {Array.isArray(c.components) && c.components.length > 0 ? (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                {c.components.map((p, pi) => (
                                  <div key={pi} style={{ display: "flex", alignItems: "baseline", gap: "5px", background: "#FBF6E8", border: `1px solid ${C.cardEdge}`, borderRadius: "4px", padding: "4px 9px", fontSize: "12.5px" }}>
                                    <span style={{ fontFamily: "'Noto Serif SC', serif", fontSize: "15px" }}>{p.hanzi}</span>
                                    <span style={{ color: C.gold }}>{p.pinyin}</span>
                                    <span style={{ color: C.inkSoft }}>· {p.meaning}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ fontSize: "12px", color: C.faint }}>เป็นอักษรพื้นฐาน แยกส่วนประกอบต่อไม่ได้อีกแล้ว</div>
                            )}
                          </div>
                        </div>
                        {Array.isArray(c.related) && c.related.length > 0 && (
                          <div style={{ marginTop: "10px", marginLeft: "70px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: C.faint, marginBottom: "6px" }}>
                              <Link2 size={11} />คำอื่นที่มีตัวนี้อยู่
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                              {c.related.map((rw, ri) => (
                                <div key={ri} style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#FBF6E8", border: `1px solid ${C.cardEdge}`, borderRadius: "4px", padding: "6px 10px", minWidth: "60px" }}>
                                  <span style={{ fontFamily: "'Noto Serif SC', serif", fontSize: "15px" }}>{rw.hanzi}</span>
                                  <span style={{ fontSize: "10px", color: C.indigo }}>{rw.pinyin}</span>
                                  <span style={{ fontSize: "10px", color: C.inkSoft, textAlign: "center" }}>{rw.meaning}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!words.length && !loading && (
              <div style={{ marginTop: "36px", textAlign: "center", color: C.faint, fontSize: "13.5px", padding: "28px 0", border: `1px dashed ${C.cardEdge}`, borderRadius: "4px" }}>
                พิมพ์หรือวาดประโยคภาษาจีนด้านบนแล้วกด "แยกคำ" เพื่อเริ่มต้น
              </div>
            )}
          </div>
        )}

        {activeTab === "jianghu" && (
          <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={cardBox({ padding: "20px", background: "linear-gradient(135deg, #FBF6E8, #F3E7C4)" })}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div><div style={{ fontFamily: "'Noto Serif Thai', serif", fontSize: "20px", fontWeight: 700 }}>每日修行 · เป้าหมายวันนี้</div><div style={{ fontSize: "12px", color: C.inkSoft, marginTop: "3px" }}>ภารกิจสั้น ๆ เพื่อรักษาวรยุทธ์ให้ต่อเนื่อง</div></div>
                <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: "24px", color: C.seal }}>{dailyComplete ? "功成" : "修行"}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "18px" }}>
                {goalItems.map((g) => { const Icon = g.icon; const pct = Math.min(100, Math.round((g.value / Math.max(1, g.target)) * 100)); return <div key={g.key}><div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "4px" }}><span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Icon size={14}/>{g.label}</span><span>{Math.min(g.value,g.target)} / {g.target}</span></div><div style={{ height: 7, background: C.cardEdge, borderRadius: 4, overflow: "hidden" }}><div style={{ width: pct + "%", height: "100%", background: g.value >= g.target ? C.jade : C.indigo }} /></div></div>; })}
              </div>
              <div style={{ marginTop: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button onClick={() => setDailyGoals((g) => ({ ...g, newWords: g.newWords === 5 ? 10 : 5 }))} style={sealBtnOutline(false)}><Target size={14}/>เป้าคำศัพท์ {dailyGoals.newWords}</button>
                <button onClick={() => setDailyGoals((g) => ({ ...g, reviews: g.reviews === 10 ? 20 : 10 }))} style={sealBtnOutline(false)}><GraduationCap size={14}/>เป้าทบทวน {dailyGoals.reviews}</button>
              </div>
            </div>
            <div style={cardBox({ padding: "20px" })}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}><Trophy size={17} color={C.gold}/><strong>เหรียญตราความสำเร็จ</strong><span style={{ fontSize: "11px", color: C.faint }}>ปลดล็อก {achievements.filter((a) => a.unlocked).length}/{achievements.length}</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: "9px" }}>{achievements.map((a) => <div key={a.id} style={{ border: "1px solid " + (a.unlocked ? C.gold : C.cardEdge), background: a.unlocked ? "#FBF2D2" : C.card, borderRadius: 5, padding: "12px", opacity: a.unlocked ? 1 : 0.55 }}><div style={{ fontSize: "24px" }}>{a.icon}</div><div style={{ fontWeight: 700, fontSize: "12.5px", marginTop: 4 }}>{a.title}</div><div style={{ fontSize: "11px", color: C.inkSoft, marginTop: 2 }}>{a.desc}</div></div>)}</div>
            </div>
            <div style={cardBox({ padding: "20px" })}>
              <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "10px" }}>ขั้นภูมิยุทธภพ</div>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}><div style={{ width: 58, height: 58, borderRadius: "50%", border: "2px solid " + C.gold, display: "grid", placeItems: "center", fontSize: "25px", background: "#F7EBCB" }}>⚔</div><div style={{ flex: 1 }}><div style={{ fontFamily: "'Noto Serif Thai', serif", fontSize: "18px", fontWeight: 700 }}>{rank.name}</div><div style={{ fontSize: "12px", color: C.inkSoft }}>{savedWords.length} คำ · {stats.totalSentences || 0} ประโยค · ต่อเนื่อง {streak} วัน</div><div style={{ marginTop: 7, height: 6, background: C.cardEdge, borderRadius: 4 }}><div style={{ width: (rankProgress * 100) + "%", height: "100%", background: C.seal, borderRadius: 4 }}/></div></div></div>
            </div>
          </div>
        )}

        {activeTab === "dashboard" && (
          <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "18px" }}>
            <div style={cardBox({ padding: "22px", display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" })}>
              <div style={{
                width: "84px", height: "84px", borderRadius: "50%", background: rank.color, display: "flex",
                alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 0 0 4px ${C.card}, 0 0 0 5px ${C.cardEdge}`,
              }}>
                <Swords size={34} color="#F6EFD9" />
              </div>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <div style={{ fontSize: "12px", color: C.inkSoft }}>ขั้นภูมิปัจจุบัน</div>
                <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: "24px", fontWeight: 900, color: rank.color }}>{rank.name}</div>
                <div style={{ fontSize: "14px", color: C.ink, marginBottom: "8px" }}>{rank.th}</div>
                {nextRank && (
                  <>
                    <div style={{ height: "8px", background: C.cardEdge, borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ width: `${rankProgress * 100}%`, height: "100%", background: rank.color }} />
                    </div>
                    <div style={{ fontSize: "11px", color: C.muted, marginTop: "4px" }}>
                      {savedWords.length} / {nextRank.min} คำ สู่ขั้น {nextRank.name} {nextRank.th}
                    </div>
                  </>
                )}
                {!nextRank && <div style={{ fontSize: "11px", color: C.gold, fontWeight: 700 }}>ถึงขั้นสูงสุดแล้ว!</div>}
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <div style={cardBox({ flex: 1, minWidth: "140px", padding: "16px", textAlign: "center" })}>
                <div style={{ fontSize: "26px", fontWeight: 700, color: C.indigo }}>{savedWords.length}</div>
                <div style={{ fontSize: "12px", color: C.inkSoft }}>คำศัพท์สะสม</div>
              </div>
              <div style={cardBox({ flex: 1, minWidth: "140px", padding: "16px", textAlign: "center" })}>
                <div style={{ fontSize: "26px", fontWeight: 700, color: C.jade }}>{stats.totalSentences || 0}</div>
                <div style={{ fontSize: "12px", color: C.inkSoft }}>ประโยคที่แยกแล้ว</div>
              </div>
              <div style={cardBox({ flex: 1, minWidth: "140px", padding: "16px", textAlign: "center" })}>
                <div style={{ fontSize: "26px", fontWeight: 700, color: C.seal, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
                  <Flame size={20} />{streak}
                </div>
                <div style={{ fontSize: "12px", color: C.inkSoft }}>วันต่อเนื่อง</div>
              </div>
            </div>

            <div style={cardBox({ padding: "18px" })}>
              <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "10px", color: C.ink }}>บันทึกการฝึกฝน (12 สัปดาห์ล่าสุด)</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gap: "3px" }}>
                {heatDays.map((d) => (
                  <div key={d} title={d} style={{
                    aspectRatio: "1", borderRadius: "2px",
                    background: activity.includes(d) ? C.jade : C.cardEdge,
                    opacity: activity.includes(d) ? 1 : 0.4,
                  }} />
                ))}
              </div>
            </div>

            <div style={cardBox({ padding: "18px" })}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: C.ink }}>คำที่ครบกำหนดทบทวน ({dueWords.length})</div>
                {dueWords.length > 0 && (
                  <button onClick={() => startFlashcards(true)} style={sealBtnFilled()}>
                    <GraduationCap size={14} />ทบทวนเลย
                  </button>
                )}
              </div>
              {dueWords.length === 0 ? (
                <div style={{ fontSize: "12.5px", color: C.faint }}>ไม่มีคำที่ครบกำหนด เยี่ยมมาก!</div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {dueWords.slice(0, 20).map((w, i) => (
                    <div key={i} style={{ background: "#FBF6E8", border: `1px solid ${C.cardEdge}`, borderRadius: "4px", padding: "5px 10px", fontSize: "12.5px", fontFamily: "'Noto Serif SC', serif" }}>{w.hanzi}</div>
                  ))}
                </div>
              )}
            </div>

            <div style={cardBox({ padding: "18px" })}>
              <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "12px", color: C.ink }}>สถิติรูปแบบไวยากรณ์ที่เจอบ่อย</div>
              {Object.keys(patternCounts).length === 0 ? (
                <div style={{ fontSize: "12.5px", color: C.faint }}>ยังไม่มีข้อมูล ลองแยกคำสักประโยคก่อน</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {Object.entries(patternCounts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => {
                    const max = Math.max(...Object.values(patternCounts));
                    return (
                      <div key={tag}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: C.inkSoft, marginBottom: "2px" }}>
                          <span>{tag}</span><span>{count}</span>
                        </div>
                        <div style={{ height: "7px", background: C.cardEdge, borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ width: `${(count / max) * 100}%`, height: "100%", background: C.indigo }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "quiz" && (
          <div style={{ marginTop: "20px" }}>
            {savedWords.length < 4 ? (
              <div style={{ textAlign: "center", color: C.faint, fontSize: "13.5px", padding: "40px 0", border: `1px dashed ${C.cardEdge}`, borderRadius: "4px" }}>
                ต้องมีคำศัพท์บันทึกไว้อย่างน้อย 4 คำถึงจะเริ่มควิซได้ (ตอนนี้มี {savedWords.length} คำ)
              </div>
            ) : quizQuestions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 0" }}>
                <button onClick={generateQuiz} style={{ ...sealBtnFilled(), padding: "12px 24px", fontSize: "15px" }}>
                  <HelpCircle size={17} />เริ่มควิซจากคำที่บันทึกไว้
                </button>
              </div>
            ) : quizIdx >= quizQuestions.length ? (
              <div style={cardBox({ padding: "30px", textAlign: "center" })}>
                <div style={{ fontSize: "15px", color: C.inkSoft, marginBottom: "6px" }}>คะแนนของคุณ</div>
                <div style={{ fontSize: "40px", fontWeight: 900, color: C.gold }}>{quizScore} / {quizQuestions.length}</div>
                <button onClick={generateQuiz} style={{ ...sealBtnFilled(), marginTop: "16px" }}>เล่นอีกครั้ง</button>
              </div>
            ) : (
              <div style={cardBox({ padding: "22px" })}>
                <div style={{ fontSize: "12px", color: C.inkSoft, marginBottom: "14px" }}>ข้อที่ {quizIdx + 1} / {quizQuestions.length} · คะแนน {quizScore}</div>
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  {quizQuestions[quizIdx].promptType === "hanzi" ? (
                    <>
                      <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: "44px", fontWeight: 700 }}>{quizQuestions[quizIdx].word.hanzi}</div>
                      <div style={{ fontSize: "13px", color: C.inkSoft, marginTop: "6px" }}>คำนี้แปลว่าอะไร?</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: "20px", fontWeight: 600 }}>{quizQuestions[quizIdx].word.thai}</div>
                      <div style={{ fontSize: "13px", color: C.inkSoft, marginTop: "6px" }}>คำนี้เขียนว่าอะไร?</div>
                    </>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {quizQuestions[quizIdx].options.map((opt, i) => {
                    const sel = quizSelected !== null;
                    const isCorrect = i === quizQuestions[quizIdx].correctIndex;
                    const isPicked = i === quizSelected;
                    let bg = C.card, border = C.cardEdge, color = C.ink;
                    if (sel && isCorrect) { bg = "#DCEAD9"; border = C.jade; }
                    else if (sel && isPicked && !isCorrect) { bg = "#F3DAD6"; border = C.seal; }
                    return (
                      <button key={i} className="cj-opt" onClick={() => answerQuiz(i)} disabled={sel} style={{
                        background: bg, border: `1.5px solid ${border}`, borderRadius: "4px", padding: "14px 10px",
                        cursor: sel ? "default" : "pointer", textAlign: "center", color,
                      }}>
                        {quizQuestions[quizIdx].promptType === "hanzi" ? (
                          <span style={{ fontSize: "14px" }}>{opt.thai}</span>
                        ) : (
                          <span style={{ fontFamily: "'Noto Serif SC', serif", fontSize: "22px" }}>{opt.hanzi}</span>
                        )}
                        {sel && isCorrect && <Check size={14} style={{ marginLeft: "6px", color: C.jade }} />}
                        {sel && isPicked && !isCorrect && <XCircle size={14} style={{ marginLeft: "6px", color: C.seal }} />}
                      </button>
                    );
                  })}
                </div>
                {quizSelected !== null && (
                  <div style={{ textAlign: "center", marginTop: "18px" }}>
                    <button onClick={nextQuiz} style={sealBtnFilled()}>
                      {quizIdx + 1 >= quizQuestions.length ? "ดูผลคะแนน" : "ข้อถัดไป"} <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "practice" && (
          <div style={{ marginTop: "20px" }}>
            {savedWords.length === 0 ? (
              <div style={{ textAlign: "center", color: C.faint, fontSize: "13.5px", padding: "40px 0", border: `1px dashed ${C.cardEdge}`, borderRadius: "4px" }}>
                ต้องมีคำศัพท์บันทึกไว้อย่างน้อย 1 คำก่อน ถึงจะฝึกแต่งประโยคได้
              </div>
            ) : (
              <div style={cardBox({ padding: "22px" })}>
                {!practiceWord ? (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <button onClick={pickPracticeWord} style={{ ...sealBtnFilled(), padding: "12px 24px", fontSize: "15px" }}>
                      <PencilLine size={17} />สุ่มคำมาฝึกแต่งประโยค
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: "12px", color: C.inkSoft, marginBottom: "8px" }}>แต่งประโยคภาษาจีนโดยใช้คำนี้:</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "16px" }}>
                      <span style={{ fontFamily: "'Noto Serif SC', serif", fontSize: "32px", fontWeight: 700 }}>{practiceWord.hanzi}</span>
                      <span style={{ fontSize: "14px", color: C.indigo }}>{practiceWord.pinyin}</span>
                      <span style={{ fontSize: "13px", color: C.inkSoft }}>{practiceWord.thai}</span>
                      <button onClick={pickPracticeWord} style={{ marginLeft: "auto", background: "none", border: "none", color: C.indigo, textDecoration: "underline", cursor: "pointer", fontSize: "12.5px" }}>สุ่มคำใหม่</button>
                    </div>
                    <textarea value={practiceInput} onChange={(e) => setPracticeInput(e.target.value)} placeholder="พิมพ์ประโยคภาษาจีนของคุณตรงนี้…" rows={2}
                      style={{ width: "100%", border: `1px solid ${C.cardEdge}`, borderRadius: "4px", padding: "10px 12px", outline: "none", resize: "none", fontFamily: "'Noto Serif SC', serif", fontSize: "18px", background: "#FBF6E8", color: C.ink }} />
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                      <button onClick={submitPractice} disabled={practiceLoading || !practiceInput.trim()} style={{ ...sealBtnFilled(), opacity: practiceLoading || !practiceInput.trim() ? 0.5 : 1 }}>
                        {practiceLoading ? (<><Loader2 size={15} style={{ animation: "spin 0.9s linear infinite" }} />กำลังตรวจ</>) : (<>ตรวจประโยค <ArrowRight size={15} /></>)}
                      </button>
                    </div>
                    {practiceError && <p style={{ color: C.seal, fontSize: "13px", marginTop: "10px" }}>{practiceError}</p>}
                    {practiceResult && (
                      <div style={{ marginTop: "18px" }}>
                        <InkDivider />
                        <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{
                            fontSize: "12px", fontWeight: 700, padding: "3px 10px", borderRadius: "3px",
                            background: practiceResult.verdict === "ดีมาก" ? "#DCEAD9" : practiceResult.verdict === "ใช้ได้" ? "#F3E8C9" : "#F3DAD6",
                            color: practiceResult.verdict === "ดีมาก" ? C.jade : practiceResult.verdict === "ใช้ได้" ? C.gold : C.seal,
                          }}>{practiceResult.verdict}</span>
                        </div>
                        <div style={{ fontSize: "13.5px", color: C.ink, marginTop: "10px", lineHeight: 1.6 }}>{practiceResult.feedback}</div>
                        {practiceResult.corrected && (
                          <div style={{ marginTop: "14px", background: "#FBF6E8", border: `1px solid ${C.cardEdge}`, borderRadius: "4px", padding: "14px" }}>
                            <div style={{ fontSize: "11px", color: C.inkSoft, marginBottom: "6px" }}>ประโยคที่แนะนำ</div>
                            <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: "18px" }}>{practiceResult.corrected}</div>
                            <div style={{ fontSize: "13px", color: C.indigo, marginTop: "4px" }}>{practiceResult.correctedPinyin}</div>
                            <div style={{ fontSize: "13px", color: C.inkSoft, marginTop: "2px" }}>{practiceResult.correctedMeaning}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {flashOpen && flashWord && (
        <div onClick={closeFlash} style={{ position: "fixed", inset: 0, background: "rgba(33,28,22,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "20px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.parchment, borderRadius: "6px", padding: "24px", maxWidth: "380px", width: "100%", position: "relative", border: `1px solid ${C.cardEdge}` }}>
            <button onClick={closeFlash} aria-label="ปิดแฟลชการ์ด" style={{ position: "absolute", top: "14px", right: "14px", background: "none", border: "none", color: C.inkSoft, cursor: "pointer", padding: "4px", display: "flex" }}>
              <X size={18} />
            </button>
            <div style={{ textAlign: "center", fontSize: "12px", color: C.inkSoft, marginBottom: "14px" }}>
              การ์ดที่ {flashIdx + 1} / {flashOrder.length}
            </div>
            <div onClick={flipFlash} style={{ cursor: "pointer", background: C.card, border: `1px solid ${C.cardEdge}`, borderRadius: "4px", padding: "36px 20px", textAlign: "center", minHeight: "220px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              {!flashFlipped ? (
                <>
                  <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: "64px", fontWeight: 700 }}>{flashWord.hanzi}</div>
                  <div style={{ fontSize: "12px", color: C.faint, marginTop: "6px" }}>แตะการ์ดเพื่อดูคำตอบ</div>
                </>
              ) : (
                <>
                  <ToneMark tone={flashWord.tone} />
                  <div style={{ fontSize: "24px", fontWeight: 600, color: TONE_COLORS[flashWord.tone] || TONE_COLORS[5] }}>{flashWord.pinyin}</div>
                  <div style={{ fontSize: "18px", color: C.ink }}>{flashWord.thai}</div>
                  {flashWord.example?.hanzi && (
                    <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${C.cardEdge}`, width: "100%" }}>
                      <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: "15px", color: C.ink }}>{flashWord.example.hanzi}</div>
                      <div style={{ fontSize: "12px", color: C.indigo, marginTop: "2px" }}>{flashWord.example.pinyin}</div>
                      <div style={{ fontSize: "12px", color: C.inkSoft, marginTop: "2px" }}>{flashWord.example.thai}</div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", gap: "8px" }}>
              <button onClick={prevCard} style={{ display: "flex", alignItems: "center", gap: "4px", background: C.card, border: `1px solid ${C.cardEdge}`, borderRadius: "4px", padding: "8px 12px", fontSize: "12.5px", color: C.inkSoft, cursor: "pointer" }}>
                <ChevronLeft size={15} />ก่อนหน้า
              </button>
              <button onClick={shuffleFlash} style={{ display: "flex", alignItems: "center", gap: "5px", background: C.card, border: `1px solid ${C.cardEdge}`, borderRadius: "4px", padding: "8px 12px", fontSize: "12.5px", color: C.inkSoft, cursor: "pointer" }}>
                <Shuffle size={14} />สลับ
              </button>
              <button onClick={nextCard} style={{ display: "flex", alignItems: "center", gap: "4px", background: C.indigo, border: "none", borderRadius: "4px", padding: "8px 12px", fontSize: "12.5px", color: "#F6EFD9", cursor: "pointer", fontWeight: 600 }}>
                ถัดไป<ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function cardBox(extra = {}) {
  return { background: C.card, border: `1px solid ${C.cardEdge}`, borderRadius: "4px", boxShadow: `0 1px 0 ${C.cardEdge}`, padding: "16px", ...extra };
}
function sealBtnFilled(extra = {}) {
  return { display: "flex", alignItems: "center", gap: "7px", background: C.seal, color: "#F6EFD9", border: "none", borderRadius: "4px", padding: "9px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer", ...extra };
}
function sealBtnOutline(active, extra = {}) {
  return { display: "flex", alignItems: "center", gap: "7px", background: active ? C.ink : C.card, color: active ? "#F6EFD9" : C.ink, border: `1px solid ${C.cardEdge}`, borderRadius: "4px", padding: "9px 14px", fontSize: "13.5px", fontWeight: 600, cursor: "pointer", ...extra };
}
