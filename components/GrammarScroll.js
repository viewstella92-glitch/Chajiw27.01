"use client";

import React, { useEffect, useState } from "react";
import { ScrollText, LockKeyhole, Unlock, BookOpenCheck } from "lucide-react";

export const PATTERN_LOG_KEY = "parseit:pattern-log";
export const UNLOCK_AT = 3;

export default function GrammarScroll() {
  const [patternLog, setPatternLog] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PATTERN_LOG_KEY);
      setPatternLog(raw ? JSON.parse(raw) : {});
    } catch {
      setPatternLog({});
    }
    setReady(true);
  }, []);

  const entries = Object.entries(patternLog || {}).flatMap(([tag, list]) =>
    (Array.isArray(list) ? list : []).map((entry) => ({ ...entry, tag }))
  );
  const unique = Array.from(new Map(entries.filter((e) => e.hanzi).map((e) => [e.hanzi, e])).values())
    .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  const unlocked = unique.length >= UNLOCK_AT;

  return (
    <section style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ padding: 22, border: "1px solid #D8C99F", borderRadius: 6, background: "linear-gradient(135deg,#FBF6E8,#F2E3BD)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <ScrollText size={27} color="#9B2924" />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Noto Serif Thai', serif", fontSize: 22, fontWeight: 800 }}>คัมภีร์ไวยากรณ์</div>
            <div style={{ color: "#655D50", fontSize: 12 }}>รวบรวมรูปแบบประโยคที่คุณเคยแยกวิเคราะห์</div>
          </div>
          {unlocked ? <Unlock size={21} color="#3D7655" /> : <LockKeyhole size={21} color="#9B2924" />}
        </div>
        <div style={{ marginTop: 16, fontSize: 13, color: "#655D50" }}>
          {ready ? (unlocked ? "ปลดล็อกแล้ว — บันทึกครบ " + unique.length + " ประโยค" : "ปลดล็อกเมื่อบันทึกครบ " + UNLOCK_AT + " ประโยคที่แตกต่างกัน · ตอนนี้ " + unique.length + "/" + UNLOCK_AT) : "กำลังเปิดคัมภีร์…"}
        </div>
        <div style={{ height: 6, marginTop: 9, background: "#D8C99F", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", width: Math.min(100, unique.length / UNLOCK_AT * 100) + "%", background: unlocked ? "#3D7655" : "#9B2924" }} />
        </div>
      </div>
      {!unlocked ? (
        <div style={{ padding: 28, textAlign: "center", border: "1px dashed #D8C99F", borderRadius: 5, color: "#655D50", background: "#FFFCF4" }}>
          <LockKeyhole size={25} style={{ margin: "0 auto 10px" }} />
          <div style={{ fontWeight: 700, fontSize: 14 }}>คัมภีร์ยังปิดผนึก</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.7, marginTop: 6 }}>ไปที่แท็บ “แยกคำ” แล้ววิเคราะห์ประโยคภาษาจีนที่แตกต่างกันอีก {Math.max(0, UNLOCK_AT - unique.length)} ประโยค ข้อมูลจะบันทึกไว้ในเบราว์เซอร์เครื่องนี้</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {unique.map((entry, index) => (
            <article key={entry.hanzi} style={{ background: "#FFFCF4", border: "1px solid #D8C99F", borderRadius: 5, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "#9B2924", fontSize: 11, fontWeight: 800 }}>
                <BookOpenCheck size={14} /> ม้วนที่ {unique.length - index} · {entry.tag || "อื่นๆ"} · {entry.at || "ไม่ทราบวันที่"}
              </div>
              <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 21, fontWeight: 700 }}>{entry.hanzi}</div>
              {entry.pinyin && <div style={{ color: "#5A6398", fontSize: 12.5, marginTop: 4 }}>{entry.pinyin}</div>}
              {entry.thai && <div style={{ color: "#655D50", fontSize: 13, marginTop: 6 }}>{entry.thai}</div>}
              {entry.pattern && <div style={{ marginTop: 10, padding: "9px 11px", background: "#F7F0DE", borderLeft: "3px solid #9B2924", fontSize: 12.5, lineHeight: 1.6 }}>{entry.pattern}</div>}
            </article>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11.5, color: "#817969" }}>หมายเหตุ: บันทึกเฉพาะในเครื่องและเบราว์เซอร์นี้ ยังไม่ซิงก์กับ Supabase</div>
    </section>
  );
}
