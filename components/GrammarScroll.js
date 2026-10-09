"use client";

import React, { useEffect, useState } from "react";
import { Scroll, Lock } from "lucide-react";
import { C, PATTERN_TAGS } from "../lib/theme";

// Written by the parse flow in app/page.js (see INTEGRATION.md).
// Shape: { [patternTag]: [{ hanzi, pinyin, thai, pattern, at }] }
export const PATTERN_LOG_KEY = "parseit:pattern-log";
export const UNLOCK_AT = 3;

export default function GrammarScroll() {
  const [log, setLog] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    try {
      setLog(JSON.parse(localStorage.getItem(PATTERN_LOG_KEY)) || {});
    } catch {
      setLog({});
    }
  }, []);

  if (!log) return null;

  const unlockedCount = PATTERN_TAGS.filter((t) => (log[t] || []).length >= UNLOCK_AT).length;

  return (
    <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
      <div
        style={{
          background: "linear-gradient(135deg, #FBF6E8, #F3E7C4)",
          border: `1px solid ${C.cardEdge}`,
          borderRadius: "6px",
          padding: "16px 18px",
        }}
      >
        <div style={{ fontFamily: "'Noto Serif Thai', serif", fontSize: "18px", fontWeight: 700 }}>
          คัมภีร์ไวยากรณ์ <span style={{ fontSize: "12px", color: C.inkSoft, fontWeight: 500 }}>語法秘笈</span>
        </div>
        <div style={{ fontSize: "12px", color: C.inkSoft, marginTop: "4px" }}>
          เจอประโยคแบบเดียวกัน {UNLOCK_AT} ประโยค จะปลดล็อกคัมภีร์ของรูปแบบนั้น ปลดแล้ว {unlockedCount} / {PATTERN_TAGS.length}
        </div>
      </div>

      {PATTERN_TAGS.map((tag) => {
        const entries = log[tag] || [];
        const unlocked = entries.length >= UNLOCK_AT;
        const isOpen = open === tag;
        const latest = entries[entries.length - 1];

        return (
          <div
            key={tag}
            style={{
              background: unlocked ? C.card : "#F4EFE3",
              border: `1px solid ${unlocked ? C.gold : C.cardEdge}`,
              borderRadius: "5px",
              opacity: unlocked ? 1 : 0.75,
            }}
          >
            <button
              onClick={() => setOpen(isOpen ? null : tag)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 14px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: C.ink,
                textAlign: "left",
                fontFamily: "'Noto Sans Thai', sans-serif",
              }}
            >
              {unlocked ? <Scroll size={15} color={C.gold} /> : <Lock size={15} color={C.faint} />}
              <span style={{ flex: 1, fontSize: "13.5px", fontWeight: 600 }}>{tag}</span>
              <span style={{ fontSize: "11.5px", color: C.inkSoft }}>
                {Math.min(entries.length, UNLOCK_AT)} / {UNLOCK_AT}
              </span>
            </button>

            {isOpen && (
              <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${C.cardEdge}` }}>
                {unlocked ? (
                  <>
                    <div style={{ fontSize: "13.5px", lineHeight: 1.6, margin: "12px 0", color: C.ink }}>
                      {latest.pattern || "ยังไม่มีคำอธิบายรูปแบบนี้"}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {entries
                        .slice()
                        .reverse()
                        .map((e, i) => (
                          <div
                            key={`${e.hanzi}-${i}`}
                            style={{ background: "#FBF6E8", border: `1px solid ${C.cardEdge}`, borderRadius: "4px", padding: "9px 11px" }}
                          >
                            <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: "16px" }}>{e.hanzi}</div>
                            {e.pinyin && <div style={{ fontSize: "12px", color: C.indigo, marginTop: "2px" }}>{e.pinyin}</div>}
                            {e.thai && <div style={{ fontSize: "12px", color: C.inkSoft, marginTop: "2px" }}>{e.thai}</div>}
                          </div>
                        ))}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: "12.5px", color: C.faint, margin: "12px 0" }}>
                    ยังไม่ปลดล็อก เจอประโยคแบบนี้อีก {UNLOCK_AT - entries.length} ประโยค
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
