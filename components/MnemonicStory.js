"use client";

import React, { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { C } from "../lib/theme";

// Use with key={word.hanzi} so state resets when the word changes.
export default function MnemonicStory({ word, chars }) {
  const cacheKey = "parseit-cache:mnemonic:" + word.hanzi;

  const [state, setState] = useState(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      return cached ? { status: "done", data: JSON.parse(cached) } : { status: "idle" };
    } catch {
      return { status: "idle" };
    }
  });

  async function generate() {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/mnemonic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hanzi: word.hanzi,
          pinyin: word.pinyin,
          thai: word.thai,
          components: (chars || []).map((c) => ({ hanzi: c.hanzi, meaning: c.meaning })),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "สร้างคำช่วยจำไม่สำเร็จ");
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {}
      setState({ status: "done", data });
    } catch {
      setState({ status: "error" });
    }
  }

  return (
    <div
      style={{
        marginTop: "16px",
        background: "#FBF6E8",
        border: `1px solid ${C.cardEdge}`,
        borderLeft: `3px solid ${C.gold}`,
        borderRadius: "4px",
        padding: "12px 14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <Sparkles size={14} color={C.gold} />
        <span style={{ fontSize: "13px", fontWeight: 700 }}>คำช่วยจำ</span>
        {state.status !== "done" && (
          <button
            onClick={generate}
            disabled={state.status === "loading"}
            style={{
              marginLeft: "auto",
              background: C.card,
              border: `1px solid ${C.cardEdge}`,
              borderRadius: "4px",
              padding: "6px 11px",
              fontSize: "12px",
              color: C.ink,
              cursor: state.status === "loading" ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {state.status === "loading" ? (
              <>
                <Loader2 size={13} style={{ animation: "spin 0.9s linear infinite" }} />
                กำลังแต่งเรื่อง…
              </>
            ) : (
              "สร้างเรื่องช่วยจำ"
            )}
          </button>
        )}
      </div>

      {state.status === "error" && (
        <div role="alert" style={{ fontSize: "12px", color: C.seal, marginTop: "8px" }}>
          สร้างคำช่วยจำไม่สำเร็จ ลองอีกครั้ง
        </div>
      )}

      {state.status === "done" && (
        <div style={{ marginTop: "10px" }}>
          {state.data.keyword && (
            <div style={{ fontSize: "14px", fontWeight: 700, color: C.seal, marginBottom: "6px" }}>
              {state.data.keyword}
            </div>
          )}
          <div style={{ fontSize: "13px", lineHeight: 1.7, color: C.ink, whiteSpace: "pre-wrap" }}>{state.data.story}</div>
        </div>
      )}
    </div>
  );
}
