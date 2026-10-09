"use client";

import React, { useMemo, useState } from "react";
import { Swords, Shield, Flame, Check, Eye, EyeOff } from "lucide-react";

const FALLBACK_WORDS = [
  { hanzi: "勇敢", pinyin: "yǒnggǎn", thai: "กล้าหาญ" },
  { hanzi: "坚持", pinyin: "jiānchí", thai: "坚持 / ยืนหยัด" },
  { hanzi: "机会", pinyin: "jīhuì", thai: "โอกาส" },
  { hanzi: "成长", pinyin: "chéngzhǎng", thai: "เติบโต / พัฒนา" },
  { hanzi: "智慧", pinyin: "zhìhuì", thai: "ปัญญา" },
  { hanzi: "目标", pinyin: "mùbiāo", thai: "เป้าหมาย" },
  { hanzi: "努力", pinyin: "nǔlì", thai: "พยายาม" },
  { hanzi: "相信", pinyin: "xiāngxìn", thai: "เชื่อมั่น" },
  { hanzi: "成功", pinyin: "chénggōng", thai: "ความสำเร็จ" },
  { hanzi: "耐心", pinyin: "nàixīn", thai: "ความอดทน" },
];

function weekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return d.getUTCFullYear() + "-W" + String(week).padStart(2, "0");
}
function hash(value) {
  let n = 0;
  for (let i = 0; i < value.length; i++) n = (n * 31 + value.charCodeAt(i)) >>> 0;
  return n;
}

export default function WeeklyBoss({ savedWords = [] }) {
  const currentWeek = weekKey();
  const [revealed, setRevealed] = useState({});
  const [cleared, setCleared] = useState({});
  const words = useMemo(() => {
    const unique = new Map();
    [...savedWords, ...FALLBACK_WORDS].forEach((word) => {
      if (word?.hanzi && word?.thai && !unique.has(word.hanzi)) unique.set(word.hanzi, word);
    });
    return Array.from(unique.values())
      .sort((a, b) => hash(currentWeek + a.hanzi) - hash(currentWeek + b.hanzi))
      .slice(0, 5);
  }, [savedWords, currentWeek]);
  const count = Object.values(cleared).filter(Boolean).length;

  return (
    <section style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ border: "1px solid #BCA46C", borderRadius: 6, padding: 22, background: "linear-gradient(135deg,#302B32,#4A3432)", color: "#F7EED7" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: 6, display: "grid", placeItems: "center", background: "#9B2924" }}><Swords size={25} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Noto Serif Thai', serif" }}>บอสประจำสัปดาห์</div>
            <div style={{ fontSize: 12, opacity: .78 }}>ศึกคำศัพท์ · {currentWeek}</div>
          </div>
          <div style={{ textAlign: "right" }}><Flame size={17} /><div style={{ fontSize: 12 }}>{count}/5 ผ่านแล้ว</div></div>
        </div>
        <div style={{ marginTop: 18, height: 7, borderRadius: 6, background: "#66585A", overflow: "hidden" }}>
          <div style={{ height: "100%", width: (count / 5 * 100) + "%", background: "#D9B86C", transition: "width .2s" }} />
        </div>
        <p style={{ margin: "14px 0 0", fontSize: 13, lineHeight: 1.7, opacity: .9 }}>ท้าทายตัวเองด้วยคำศัพท์ 5 คำที่หมุนเวียนตามสัปดาห์ ลองนึกความหมายก่อนเปิดเฉลย แล้วทำเครื่องหมายเมื่อจำได้</p>
      </div>
      {words.map((word, index) => {
        const shown = !!revealed[word.hanzi];
        const done = !!cleared[word.hanzi];
        return (
          <div key={word.hanzi} style={{ display: "flex", alignItems: "center", gap: 14, padding: 15, background: "#FFFCF4", border: "1px solid #D8C99F", borderRadius: 5 }}>
            <div style={{ color: "#9B2924", fontSize: 12, fontWeight: 800, width: 22 }}>#{index + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 27, fontWeight: 700 }}>{word.hanzi}</div>
              <div style={{ color: "#5A6398", fontSize: 12 }}>{shown ? (word.pinyin || "—") : "นึกเสียงอ่านก่อน"}</div>
              {shown && <div style={{ color: "#655D50", fontSize: 13, marginTop: 3 }}>{word.thai}</div>}
            </div>
            <button onClick={() => setRevealed((p) => ({ ...p, [word.hanzi]: !p[word.hanzi] }))} aria-label={shown ? "ซ่อนคำตอบ" : "เปิดคำตอบ"} style={{ border: "1px solid #D8C99F", background: "#FBF6E8", padding: "8px 10px", borderRadius: 4, cursor: "pointer", display: "flex", gap: 5, alignItems: "center", fontSize: 12 }}>
              {shown ? <EyeOff size={14} /> : <Eye size={14} />}{shown ? "ซ่อน" : "เฉลย"}
            </button>
            <button onClick={() => setCleared((p) => ({ ...p, [word.hanzi]: !p[word.hanzi] }))} aria-label={done ? "ยกเลิกว่าจำได้" : "ทำเครื่องหมายว่าจำได้"} style={{ border: "1px solid " + (done ? "#3D7655" : "#D8C99F"), background: done ? "#DCEAD9" : "#FFFCF4", color: done ? "#3D7655" : "#655D50", padding: 8, borderRadius: 4, cursor: "pointer" }}>
              {done ? <Check size={16} /> : <Shield size={16} />}
            </button>
          </div>
        );
      })}
    </section>
  );
}
