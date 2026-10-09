"use client";

import React, { useState } from "react";
import { Sparkles, Loader2, BookOpen, RefreshCw } from "lucide-react";

export default function MnemonicStory({ word, chars = [] }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createStory() {
    if (!word?.hanzi || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/mnemonic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: { hanzi: word.hanzi, pinyin: word.pinyin || "", thai: word.thai || word.meaning || "", example: word.example || null },
          chars: chars.map((c) => ({ hanzi: c.hanzi, pinyin: c.pinyin, meaning: c.meaning, components: c.components || [] })),
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "สร้างคำช่วยจำไม่สำเร็จ");
      setResult(data);
    } catch (e) {
      setError(e?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 4, padding: 15, border: "1px solid #D8C99F", borderRadius: 5, background: "linear-gradient(135deg,#FBF6E8,#F7EED7)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <BookOpen size={17} color="#9B2924" />
        <div style={{ fontSize: 14, fontWeight: 800, flex: 1 }}>คำช่วยจำ · 记忆故事</div>
      </div>
      <div style={{ fontSize: 12.5, color: "#655D50", lineHeight: 1.65, marginBottom: 11 }}>ให้ AI ช่วยแต่งเรื่องสั้นเชื่อมเสียงอ่าน ความหมาย และส่วนประกอบของคำนี้ เพื่อให้จำได้ง่ายขึ้น</div>
      <button onClick={createStory} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 13px", border: "none", borderRadius: 4, background: "#9B2924", color: "#F6EFD9", fontSize: 12.5, fontWeight: 700, cursor: loading ? "wait" : "pointer", opacity: loading ? .7 : 1 }}>
        {loading ? <Loader2 size={15} style={{ animation: "spin .9s linear infinite" }} /> : result ? <RefreshCw size={15} /> : <Sparkles size={15} />}
        {loading ? "กำลังสร้างเรื่อง…" : result ? "สร้างเรื่องใหม่" : "สร้างเรื่องช่วยจำ"}
      </button>
      {error && <div role="alert" style={{ color: "#9B2924", fontSize: 12.5, marginTop: 10, lineHeight: 1.6 }}>{error}</div>}
      {result && (
        <div style={{ marginTop: 13, padding: 13, background: "#FFFCF4", border: "1px solid #E1D4B5", borderRadius: 4 }}>
          <div style={{ fontFamily: "'Noto Serif Thai', serif", fontSize: 16, fontWeight: 800, marginBottom: 7 }}>{result.title || "เรื่องช่วยจำ"}</div>
          {result.story && <div style={{ fontSize: 13.5, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{result.story}</div>}
          {result.mnemonic && <div style={{ marginTop: 10, padding: 10, background: "#F2E3BD", borderRadius: 4, fontSize: 12.5, lineHeight: 1.7 }}><strong>เคล็ดจำ:</strong> {result.mnemonic}</div>}
          {result.breakdown && <div style={{ marginTop: 8, fontSize: 12, color: "#655D50", lineHeight: 1.65 }}>{result.breakdown}</div>}
        </div>
      )}
    </div>
  );
}
