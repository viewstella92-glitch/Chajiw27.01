"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronRight, Volume2, RotateCcw, Headphones, Trophy } from "lucide-react";
import { cloudEnabled, loadCloudData, saveCloudData } from "../../lib/cloud";
import { C } from "../../lib/theme";

const STORAGE_KEY = "parseit:saved-words";

function wordKey(w) {
  return `${w.hanzi}__${w.pinyin}`;
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function speak(text, rate = 0.78) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text));
  u.lang = "zh-CN";
  u.rate = rate;
  u.pitch = 1;
  window.speechSynthesis.speak(u);
  return true;
}

export default function ListeningPage() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [started, setStarted] = useState(false);\n  const [recorded, setRecorded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        let merged = Array.isArray(local) ? local : [];
        if (cloudEnabled) {
          const cloud = await loadCloudData();
          const cloudWords = Array.isArray(cloud?.savedWords) ? cloud.savedWords : [];
          const map = new Map();
          [...cloudWords, ...merged].forEach((w) => {
            if (w?.hanzi) map.set(wordKey(w), w);
          });
          merged = [...map.values()];
        }
        if (!cancelled) setWords(shuffle(merged).slice(0, 30));
      } catch (e) {
        if (!cancelled) setWords([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const current = words[index] || null;

  function makeChoices(target, pool) {
    const others = shuffle(pool.filter((w) => wordKey(w) !== wordKey(target))).slice(0, 3);
    return shuffle([target, ...others]);
  }

  function begin() {
    if (words.length < 2) return;
    const first = words[0];
    setIndex(0);
    setScore(0);
    setRound(0);
    setSelected(null);
    setChoices(makeChoices(first, words));
    setStarted(true);
    setTimeout(() => speak(first.hanzi), 150);
  }

  function answer(choice) {
    if (selected || !current) return;
    setSelected(choice);
    if (wordKey(choice) === wordKey(current)) setScore((s) => s + 1);
  }

  function next() {
    const nextIndex = index + 1;
    if (nextIndex >= Math.min(words.length, 10)) {
      setStarted(false);
      setRound(Math.min(words.length, 10));
      return;
    }
    const nextWord = words[nextIndex];
    setIndex(nextIndex);
    setSelected(null);
    setChoices(makeChoices(nextWord, words));
    setTimeout(() => speak(nextWord.hanzi), 120);
  }

  const total = Math.min(words.length, 10);
  const percent = total ? Math.round((score / total) * 100) : 0;

  if (loading) {
    return <main style={page}><div style={card}><div style={muted}>กำลังโหลดคลังคำศัพท์…</div></div></main>;
  }

  if (words.length < 4) {
    return (
      <main style={page}>
        <div style={card}>
          <div style={eyebrow}>听力训练 · LISTENING</div>
          <h1 style={title}>ฝึกฟังภาษาจีน</h1>
          <p style={muted}>ต้องมีคำศัพท์ที่บันทึกไว้อย่างน้อย 4 คำก่อน จึงจะสร้างตัวเลือกได้</p>
          <a href="/" style={button}>← กลับ Chajiw</a>
        </div>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={{ width: "100%", maxWidth: 760 }}>
        <a href="/" style={back}><ArrowLeft size={15}/> Chajiw</a>

        {!started ? (
          <div style={card}>
            <div style={iconBox}><Headphones size={22}/></div>
            <div style={eyebrow}>听力训练 · LISTENING</div>
            <h1 style={title}>{round ? "รอบนี้เสร็จแล้ว" : "ฝึกฟังจากคำศัพท์ของคุณ"}</h1>
            <p style={muted}>ระบบจะอ่านคำจีนให้ฟัง แล้วให้เลือกความหมายจาก 4 ตัวเลือก พยายามฟังโดยไม่มองตัวอักษร</p>

            {round > 0 && (
              <div style={resultBox}>
                <Trophy size={20}/>
                <div><strong>{score} / {round}</strong><div style={muted}>ตอบถูก {percent}%</div></div>
              </div>
            )}

            <button onClick={begin} style={primary}><Headphones size={16}/> {round ? "ฝึกอีกครั้ง" : "เริ่มฝึก 10 ข้อ"} <ChevronRight size={16}/></button>
          </div>
        ) : (
          <div style={card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
              <div style={eyebrow}>ข้อ {index + 1} / {total}</div>
              <div style={{fontSize:13,fontWeight:700}}>คะแนน {score}</div>
            </div>

            <div style={progress}><div style={{width:(((index + 1) / total) * 100) + "%",height:"100%",background:C.seal,transition:"width .2s"}}/></div>

            <div style={listenBox}>
              <div style={muted}>ฟังคำจีน แล้วเลือกคำแปลที่ตรงที่สุด</div>
              <button onClick={() => speak(current.hanzi, 0.72)} style={listenButton}><Volume2 size={25}/><span>ฟังอีกครั้ง</span></button>
              <div style={{fontSize:12,color:C.faint}}>พยายามตอบก่อนเปิดดูตัวอักษร</div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {choices.map((choice) => {
                const correct = wordKey(choice) === wordKey(current);
                const picked = selected && wordKey(choice) === wordKey(selected);
                let background = "#fffdf6";
                let border = C.cardEdge;
                if (selected && correct) { background = "#EAF4EA"; border = "#6C9B72"; }
                else if (selected && picked) { background = "#F8E9E7"; border = C.seal; }
                return (
                  <button key={wordKey(choice)} onClick={() => answer(choice)} disabled={!!selected} style={{...choiceButton,background,borderColor:border}}>
                    <span style={{fontWeight:700}}>{choice.meaning || "ไม่ทราบความหมาย"}</span>
                    {selected && <span style={{fontFamily:"'Noto Serif SC', serif",fontSize:15,color:C.inkSoft}}>{choice.hanzi}</span>}
                  </button>
                );
              })}
            </div>

            {selected && (
              <div style={{marginTop:14}}>
                <div style={{padding:12,borderRadius:5,background:"#F7F1E2",fontSize:13}}>
                  {wordKey(selected) === wordKey(current) ? <><Check size={15} style={{verticalAlign:"-3px"}}/> ถูกต้อง — {current.hanzi} · {current.pinyin}</> : <>คำตอบคือ <strong>{current.hanzi}</strong> · {current.pinyin}</>}
                </div>
                <button onClick={next} style={{...primary,marginTop:12}}>{index + 1 >= total ? "ดูผลคะแนน" : "ข้อต่อไป"} <ChevronRight size={16}/></button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

const page = {
  minHeight:"100vh", background:"#F4EEDC", padding:"32px 18px",
  display:"flex", justifyContent:"center", fontFamily:"'Noto Sans Thai', sans-serif", color:C.ink
};
const card = { background:C.card, border:"1px solid "+C.cardEdge, borderRadius:7, padding:26, boxShadow:"0 8px 28px rgba(70,50,20,.06)" };
const title = { fontFamily:"'Noto Serif Thai', serif",fontSize:30,margin:"7px 0 8px" };
const muted = { color:C.inkSoft,fontSize:13,lineHeight:1.7 };
const eyebrow = { color:C.seal,fontSize:12,fontWeight:800,letterSpacing:".08em" };
const iconBox = { width:48,height:48,borderRadius:6,background:"#F2E3BD",display:"grid",placeItems:"center",color:C.seal,marginBottom:15 };
const button = { display:"inline-block",marginTop:18,padding:"10px 15px",borderRadius:4,background:C.indigo,color:"#fff",textDecoration:"none",fontWeight:700,fontSize:13 };
const primary = { display:"flex",alignItems:"center",justifyContent:"center",gap:7,width:"100%",padding:"12px 16px",border:0,borderRadius:4,background:C.seal,color:"#F6EFD9",fontSize:14,fontWeight:700,cursor:"pointer",marginTop:18 };
const back = { display:"inline-flex",alignItems:"center",gap:5,color:C.inkSoft,textDecoration:"none",fontSize:13,marginBottom:14 };
const progress = { height:6,background:"#E0D5B7",borderRadius:5,overflow:"hidden",margin:"9px 0 20px" };
const listenBox = { textAlign:"center",padding:"22px 10px 24px",background:"#FBF6E8",border:"1px solid "+C.cardEdge,borderRadius:6,marginBottom:14 };
const listenButton = { margin:"16px auto 8px",display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"14px 25px",border:"1px solid "+C.cardEdge,borderRadius:5,background:"#fffdf6",color:C.seal,fontWeight:800,cursor:"pointer" };
const choiceButton = { minHeight:68,padding:"12px",border:"1px solid",borderRadius:5,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,cursor:"pointer",fontFamily:"'Noto Sans Thai', sans-serif" };
const resultBox = { display:"flex",alignItems:"center",gap:12,background:"#F7F1E2",border:"1px solid "+C.cardEdge,borderRadius:5,padding:14,marginTop:18 };
