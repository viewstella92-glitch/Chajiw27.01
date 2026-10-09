"use client";

import React, { useEffect, useState } from "react";
import { Swords, Trophy, Check, XCircle, Heart } from "lucide-react";
import { C } from "../lib/theme";

const BOSS_KEY = "parseit:boss";
const LIVES = 3;
const BOSS_SIZE = 5;

// ISO-like week key, e.g. "2026-W41". A new boss appears each week.
function weekId(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadBoss() {
  try {
    return JSON.parse(localStorage.getItem(BOSS_KEY)) || null;
  } catch {
    return null;
  }
}

function saveBoss(boss) {
  try {
    localStorage.setItem(BOSS_KEY, JSON.stringify(boss));
  } catch {}
}

// The boss is built from the user's least-reviewed words for the current week.
function createBoss(savedWords, previous) {
  const weakest = [...savedWords]
    .sort((a, b) => (a.reviewCount || 0) - (b.reviewCount || 0))
    .slice(0, BOSS_SIZE * 2);
  const picked = shuffle(weakest)
    .slice(0, BOSS_SIZE)
    .map((w) => ({ hanzi: w.hanzi, pinyin: w.pinyin, thai: w.thai }));
  return {
    week: weekId(),
    words: picked,
    defeated: [],
    wins: previous?.wins || 0,
  };
}

// Multiple choice: the correct meaning plus up to 3 meanings from other saved words.
function buildQuestion(word, savedWords) {
  const others = [
    ...new Set(savedWords.filter((w) => w.thai && w.thai !== word.thai).map((w) => w.thai)),
  ];
  const options = shuffle([word.thai, ...shuffle(others).slice(0, 3)]);
  return { word, options, answer: word.thai };
}

const cardStyle = {
  background: C.card,
  border: `1px solid ${C.cardEdge}`,
  borderRadius: "6px",
  padding: "20px",
};

export default function WeeklyBoss({ savedWords = [] }) {
  const [ready, setReady] = useState(false);
  const [boss, setBoss] = useState(null);
  const [lives, setLives] = useState(LIVES);
  const [round, setRound] = useState(0);
  const [question, setQuestion] = useState(null);
  const [picked, setPicked] = useState(null);

  const distinctMeanings = new Set(savedWords.map((w) => w.thai).filter(Boolean)).size;
  const enoughWords = distinctMeanings >= 4;

  useEffect(() => {
    setBoss(loadBoss());
    setReady(true);
  }, []);

  // Create a new boss when none exists or the week has changed.
  useEffect(() => {
    if (!ready || !enoughWords) return;
    if (!boss || boss.week !== weekId()) {
      const next = createBoss(savedWords, boss);
      setBoss(next);
      saveBoss(next);
      setLives(LIVES);
      setPicked(null);
      setRound((r) => r + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, enoughWords, boss]);

  const remaining = boss ? boss.words.filter((w) => !boss.defeated.includes(w.hanzi)) : [];
  const won = !!boss && remaining.length === 0;
  const lost = lives <= 0;

  // Build the next question when the round changes or a new boss appears.
  useEffect(() => {
    if (!boss || won || lost || remaining.length === 0) {
      setQuestion(null);
      return;
    }
    setQuestion(buildQuestion(remaining[0], savedWords));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, boss?.week]);

  function answer(i) {
    if (picked !== null || !question) return;
    setPicked(i);
    if (question.options[i] === question.answer) {
      const next = { ...boss, defeated: [...boss.defeated, question.word.hanzi] };
      if (next.defeated.length === next.words.length) {
        next.wins = (boss.wins || 0) + 1;
      }
      setBoss(next);
      saveBoss(next);
    } else {
      setLives((l) => l - 1);
    }
  }

  function nextRound() {
    setPicked(null);
    setRound((r) => r + 1);
  }

  function retry() {
    setLives(LIVES);
    setPicked(null);
    setRound((r) => r + 1);
  }

  if (!ready) return null;

  if (!enoughWords) {
    return (
      <div style={{ ...cardStyle, marginTop: "20px", textAlign: "center", color: C.faint, fontSize: "13.5px" }}>
        ต้องมีคำศัพท์ที่มีความหมายต่างกันอย่างน้อย 4 คำ ถึงจะท้าบอสประจำสัปดาห์ได้
      </div>
    );
  }

  if (!boss) return null;

  const total = boss.words.length;

  return (
    <div style={{ ...cardStyle, marginTop: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
        <Swords size={17} color={C.seal} />
        <strong style={{ fontFamily: "'Noto Serif Thai', serif", fontSize: "17px" }}>บอสประจำสัปดาห์</strong>
        <span style={{ fontSize: "11px", color: C.faint }}>{boss.week}</span>
        <span style={{ marginLeft: "auto", fontSize: "12px", color: C.inkSoft }}>
          ปราบแล้ว {boss.wins || 0} ครั้ง
        </span>
      </div>

      <div style={{ fontSize: "12px", color: C.inkSoft, marginBottom: "6px" }}>
        พลังบอส {total - boss.defeated.length} / {total}
      </div>
      <div style={{ height: "8px", background: C.cardEdge, borderRadius: "4px", overflow: "hidden" }}>
        <div
          style={{
            width: `${(boss.defeated.length / total) * 100}%`,
            height: "100%",
            background: C.jade,
            transition: "width .25s ease",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: "4px", marginTop: "10px" }}>
        {Array.from({ length: LIVES }).map((_, i) => (
          <Heart key={i} size={16} color={C.seal} fill={i < lives ? C.seal : "none"} />
        ))}
      </div>

      {won && (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <Trophy size={40} color={C.gold} />
          <div style={{ fontSize: "17px", fontWeight: 700, marginTop: "8px" }}>ปราบบอสสำเร็จ!</div>
          <div style={{ fontSize: "12.5px", color: C.inkSoft, marginTop: "4px" }}>
            สัปดาห์หน้าจะมีบอสตัวใหม่จากคำที่คุณยังจำได้ไม่แม่น
          </div>
        </div>
      )}

      {!won && lost && (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ fontSize: "15px", fontWeight: 700, color: C.seal }}>พลังชีวิตหมด บอสยังไม่ล้ม</div>
          <button
            onClick={retry}
            style={{
              marginTop: "12px",
              background: C.seal,
              color: "#F6EFD9",
              border: "none",
              borderRadius: "4px",
              padding: "9px 16px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ท้าใหม่อีกครั้ง
          </button>
        </div>
      )}

      {!won && !lost && question && (
        <>
          <div style={{ textAlign: "center", margin: "18px 0" }}>
            <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: "48px", fontWeight: 700 }}>
              {question.word.hanzi}
            </div>
            <div style={{ fontSize: "13px", color: C.indigo }}>{question.word.pinyin}</div>
            <div style={{ fontSize: "12px", color: C.inkSoft, marginTop: "4px" }}>เลือกความหมายที่ถูกต้อง</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {question.options.map((opt, i) => {
              const sel = picked !== null;
              const isCorrect = opt === question.answer;
              let bg = "#FBF6E8";
              let border = C.cardEdge;
              if (sel && isCorrect) {
                bg = "#DCEAD9";
                border = C.jade;
              } else if (sel && i === picked) {
                bg = "#F3DAD6";
                border = C.seal;
              }
              return (
                <button
                  key={i}
                  disabled={sel}
                  onClick={() => answer(i)}
                  style={{
                    background: bg,
                    border: `1.5px solid ${border}`,
                    borderRadius: "4px",
                    padding: "13px 10px",
                    fontSize: "14px",
                    color: C.ink,
                    cursor: sel ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  {opt}
                  {sel && isCorrect && <Check size={14} color={C.jade} />}
                  {sel && i === picked && !isCorrect && <XCircle size={14} color={C.seal} />}
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <button
                onClick={nextRound}
                style={{
                  background: C.indigo,
                  color: "#F6EFD9",
                  border: "none",
                  borderRadius: "4px",
                  padding: "9px 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ต่อไป
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
