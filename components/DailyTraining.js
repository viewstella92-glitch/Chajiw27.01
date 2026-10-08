"use client";

import React from "react";
import { Scroll, BookMarked, GraduationCap, ArrowRight, Flame, Check, Swords, Headphones } from "lucide-react";

export default function DailyTraining({
  todayDaily, dailyGoals, dailyComplete, dueWords, savedWords, streak, rank,
  onReview, onLearn, onAnalyze,
}) {
  const items = [
    { key: "reviews", label: "ทบทวนคำที่ถึงกำหนด", value: todayDaily.reviews, target: dailyGoals.reviews, icon: GraduationCap, action: onReview },
    { key: "newWords", label: "เพิ่มคำศัพท์ใหม่", value: todayDaily.newWords, target: dailyGoals.newWords, icon: BookMarked, action: onLearn },
    { key: "sentences", label: "วิเคราะห์ประโยค", value: todayDaily.sentences, target: dailyGoals.sentences, icon: Scroll, action: onAnalyze },\n    { key: "listening", label: "ฝึกฟังภาษาจีน", value: todayDaily.listening || 0, target: dailyGoals.listening || 5, icon: Headphones, action: onListening },
  ];
  const next = items.find((x) => x.value < x.target);
  const remaining = items.reduce((n, x) => n + Math.max(0, x.target - x.value), 0);

  return (
    <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ background: "linear-gradient(135deg, #FBF6E8 0%, #F2E3BD 100%)", border: "1px solid #D8C99F", borderRadius: "6px", padding: "22px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "'Noto Serif Thai', serif", fontSize: "24px", fontWeight: 800 }}>今日修行</div>
            <div style={{ color: "#655D50", fontSize: "13px", marginTop: "3px" }}>ภารกิจวันนี้ — ไม่ต้องคิดว่าจะเรียนอะไร ระบบจัดลำดับให้แล้ว</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: "26px", color: "#9B2924", fontWeight: 800 }}>{dailyComplete ? "功成" : "修行中"}</div>
            <div style={{ fontSize: "11px", color: "#817969" }}>{dailyComplete ? "ภารกิจวันนี้สำเร็จแล้ว" : "เหลืออีก " + remaining + " ภารกิจ"}</div>
          </div>
        </div>

        <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "11px" }}>
          {items.map((item) => {
            const Icon = item.icon;
            const done = item.value >= item.target;
            const pct = Math.min(100, Math.round((item.value / Math.max(1, item.target)) * 100));
            return (
              <div key={item.key} style={{ background: "rgba(255,255,255,0.38)", border: "1px solid #E1D4B5", borderRadius: "5px", padding: "11px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Icon size={15} />
                  <span style={{ flex: 1, fontSize: "13px", fontWeight: 600 }}>{item.label}</span>
                  <span style={{ fontSize: "12px", color: "#655D50" }}>{Math.min(item.value, item.target)} / {item.target}</span>
                  {done && <Check size={15} color="#3D7655" />}
                </div>
                <div style={{ height: "6px", marginTop: "7px", background: "#D8C99F", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ width: pct + "%", height: "100%", background: done ? "#3D7655" : "#5A6398", transition: "width .25s ease" }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: "18px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {next ? (
            <button onClick={next.action} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#9B2924", color: "#F6EFD9", border: "none", borderRadius: "4px", padding: "11px 16px", fontSize: "13.5px", fontWeight: 700, cursor: "pointer" }}>
              <Icon size={16} />
              {next.key === "reviews" ? "เริ่มทบทวน" : next.key === "newWords" ? "ไปเรียนคำใหม่" : next.key === "sentences" ? "วิเคราะห์ประโยค" : "เริ่มฝึกฟัง"}
              <ArrowRight size={15} />
            </button>
          ) : (
            <button onClick={onReview} disabled={savedWords.length === 0} style={{ display: "flex", alignItems: "center", gap: "7px", background: "#3D7655", color: "#fff", border: "none", borderRadius: "4px", padding: "10px 15px", fontSize: "13px", fontWeight: 700, cursor: savedWords.length ? "pointer" : "default", opacity: savedWords.length ? 1 : .5 }}>
              <GraduationCap size={15} /> ทบทวนเพิ่มเติม
            </button>
          )}
          {next?.key === "reviews" && dueWords.length > 0 && <span style={{ fontSize: "12px", color: "#655D50" }}>มี {dueWords.length} คำรอทบทวน</span>}
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "150px", background: "#fffdf6", border: "1px solid #D8C99F", borderRadius: "5px", padding: "15px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", color: "#9B2924", fontWeight: 700, fontSize: "12px" }}><Flame size={15} /> ต่อเนื่อง</div>
          <div style={{ fontSize: "25px", fontWeight: 800, marginTop: "4px" }}>{streak} <span style={{ fontSize: "12px", fontWeight: 500 }}>วัน</span></div>
        </div>
        <div style={{ flex: 1, minWidth: "150px", background: "#fffdf6", border: "1px solid #D8C99F", borderRadius: "5px", padding: "15px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", color: "#5A6398", fontWeight: 700, fontSize: "12px" }}><Swords size={15} /> ขั้นภูมิ</div>
          <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: "19px", fontWeight: 800, marginTop: "5px" }}>{rank?.name || "-"}</div>
        </div>
        <div style={{ flex: 1, minWidth: "150px", background: "#fffdf6", border: "1px solid #D8C99F", borderRadius: "5px", padding: "15px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", color: "#3D7655", fontWeight: 700, fontSize: "12px" }}><BookMarked size={15} /> คลังคำศัพท์</div>
          <div style={{ fontSize: "25px", fontWeight: 800, marginTop: "4px" }}>{savedWords.length} <span style={{ fontSize: "12px", fontWeight: 500 }}>คำ</span></div>
        </div>
      </div>

      <div style={{ background: "#fffdf6", border: "1px solid #D8C99F", borderRadius: "5px", padding: "16px 18px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>วิธีใช้หน้านี้</div>
        <div style={{ fontSize: "12.5px", color: "#655D50", lineHeight: 1.7 }}>เปิด Chajiw แล้วเข้าหน้านี้ก่อนทุกครั้ง จากนั้นทำภารกิจบนสุดให้ครบ ระบบจะพาคุณไปยังเครื่องมือที่เหมาะกับสิ่งที่ยังขาด ไม่จำเป็นต้องเลือกเมนูเอง</div>
      </div>
    </div>
  );
}
