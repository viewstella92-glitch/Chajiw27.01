"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronRight, Headphones, RotateCcw, Trophy, Volume2, Keyboard, ListChecks } from "lucide-react";
import { cloudEnabled, loadCloudData, saveCloudData } from "../../lib/cloud";
import { C } from "../../lib/theme";

const STORAGE_KEY = "parseit:saved-words";
const DAILY_KEY = "parseit:daily-stats";
const LISTENING_SRS_KEY = "parseit:listening-srs";

function wordKey(w) { return `${w.hanzi}__${w.pinyin || ""}`; }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
function normalize(s) { return String(s || "").replace(/[，。！？、；：“”‘’（）()【】\[\]…,.!?;:'"\s]/g, ""); }
function speak(text, rate = 0.78) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text));
  u.lang = "zh-CN"; u.rate = rate; u.pitch = 1; window.speechSynthesis.speak(u); return true;
}
function loadLocal() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
function saveLocal(words) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(words)); } catch {} }
function loadSrs() { try { return JSON.parse(localStorage.getItem(LISTENING_SRS_KEY) || "{}"); } catch { return {}; } }
function saveSrs(v) { try { localStorage.setItem(LISTENING_SRS_KEY, JSON.stringify(v)); } catch {} }
function srsWeight(w, srs) {
  const x = srs[wordKey(w)] || {};
  const wrong = x.wrong || 0, correct = x.correct || 0;
  const due = !x.nextListeningReview || new Date(x.nextListeningReview).getTime() <= Date.now();
  const accuracy = correct + wrong ? correct / (correct + wrong) : 0.5;
  let weight = due ? 4 : 1;
  if (wrong > correct) weight += 4;
  else if (wrong > 0) weight += 2;
  if (accuracy < 0.6) weight += 3;
  else if (accuracy < 0.8) weight += 1;
  return weight;
}
function chooseAdaptive(pool, srs, count) {
  const bag = [];
  pool.forEach(w => { for (let i = 0; i < Math.max(1, Math.round(srsWeight(w, srs))); i++) bag.push(w); });
  const out = [];
  while (out.length < count && bag.length) {
    const pick = bag[Math.floor(Math.random() * bag.length)];
    if (!out.some(w => wordKey(w) === wordKey(pick)) || out.length >= pool.length) out.push(pick);
    const key = wordKey(pick);
    for (let i = bag.length - 1; i >= 0; i--) if (wordKey(bag[i]) === key) bag.splice(i, 1);
  }
  return out.length ? out : shuffle(pool).slice(0, count);
}
function nextInterval(streak) { return [1,2,4,7,14,30][Math.min(streak, 5)]; }

export default function ListeningPage() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);\n  const [srs, setSrs] = useState({});
  const [mode, setMode] = useState("meaning");
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [choices, setChoices] = useState([]);
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [results, setResults] = useState([]);
  const [recorded, setRecorded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let local = loadLocal();
        let merged = local;
        if (cloudEnabled) {
          const cloud = await loadCloudData();
          const cloudWords = Array.isArray(cloud?.savedWords) ? cloud.savedWords : [];
          const map = new Map();
          [...cloudWords, ...local].forEach(w => { if (w?.hanzi) map.set(wordKey(w), w); });
          merged = [...map.values()];
        }
        if (!cancelled) setWords(merged.filter(w => w?.hanzi));
      } catch { if (!cancelled) setWords([]); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const usable = useMemo(() => shuffle(words).slice(0, 30), [words]);

  function makeChoices(target, pool) {
    return shuffle([target, ...shuffle(pool.filter(w => wordKey(w) !== wordKey(target))).slice(0, 3)]);
  }

  function makeRound(selectedMode) {
    const pool = usable;
    const qs = chooseAdaptive(pool, srs, Math.min(10, pool.length));
    setQuestions(qs);
    setIndex(0); setScore(0); setSelected(null); setAnswered(false); setInput("");
    setResults([]); setRecorded(false); setRound(0); setMode(selectedMode);
    if (selectedMode === "meaning") setChoices(makeChoices(qs[0], pool));
    setStarted(true);
    setTimeout(() => speak(qs[0]?.hanzi), 180);
  }

  function begin(modeToStart = mode) {
    if (usable.length < (modeToStart === "meaning" ? 4 : 1)) return;
    makeRound(modeToStart);
  }

  function checkAnswer(value) {
    if (answered) return;
    const q = questions[index];
    const correct = mode === "meaning"
      ? wordKey(value) === wordKey(q)
      : normalize(value) === normalize(q.hanzi);
    setAnswered(true);
    setSelected(value);
    if (correct) setScore(s => s + 1);
    setResults(r => [...r, { key: wordKey(q), correct }]);
    updateWordSkill(q, correct);
  }

  async function updateWordSkill(q, correct) {
    const key = wordKey(q);
    const prev = srs[key] || {};
    const nextCorrect = (prev.correct || 0) + (correct ? 1 : 0);
    const nextWrong = (prev.wrong || 0) + (correct ? 0 : 1);
    const streak = correct ? (prev.correctStreak || 0) + 1 : 0;
    const nextReview = new Date(Date.now() + nextInterval(streak) * 86400000).toISOString();
    const nextSrs = { ...srs, [key]: { correct: nextCorrect, wrong: nextWrong, correctStreak: streak, lastResult: correct ? "correct" : "wrong", lastReviewed: new Date().toISOString(), nextListeningReview: nextReview } };
    setSrs(nextSrs);
    saveSrs(nextSrs);
    const local = loadLocal();
    const updated = local.map(w => wordKey(w) === wordKey(q)
      ? { ...w, listeningCorrect: (w.listeningCorrect || 0) + (correct ? 1 : 0), listeningWrong: (w.listeningWrong || 0) + (correct ? 0 : 1), lastListening: new Date().toISOString() }
      : w);
    if (updated.some((w, i) => w !== local[i])) saveLocal(updated);
    setWords(prev => prev.map(w => wordKey(w) === wordKey(q)
      ? { ...w, listeningCorrect: (w.listeningCorrect || 0) + (correct ? 1 : 0), listeningWrong: (w.listeningWrong || 0) + (correct ? 0 : 1), lastListening: new Date().toISOString() }
      : w));
    if (cloudEnabled) {
      try {
        const cloud = await loadCloudData();
        if (cloud) await saveCloudData({ ...cloud, savedWords: (cloud.savedWords || []).map(w => wordKey(w) === wordKey(q)
          ? { ...w, listeningCorrect: (w.listeningCorrect || 0) + (correct ? 1 : 0), listeningWrong: (w.listeningWrong || 0) + (correct ? 0 : 1), lastListening: new Date().toISOString() }
          : w) });
      } catch {}
    }
  }

  function next() {
    const n = index + 1;
    if (n >= questions.length) {
      if (!recorded) recordTraining();
      setStarted(false); setRound(questions.length);
      return;
    }
    setIndex(n); setSelected(null); setAnswered(false); setInput("");
    if (mode === "meaning") setChoices(makeChoices(questions[n], usable));
    setTimeout(() => speak(questions[n]?.hanzi), 120);
  }

  function recordTraining() {
    setRecorded(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const current = JSON.parse(localStorage.getItem(DAILY_KEY) || "null");
      const base = current?.date === today ? current : { date: today, sentences: 0, newWords: 0, reviews: 0, listening: 0 };
      const nextStats = { ...base, listening: (base.listening || 0) + questions.length };
      localStorage.setItem(DAILY_KEY, JSON.stringify(nextStats));
      if (cloudEnabled) loadCloudData().then(cloud => cloud && saveCloudData({ ...cloud, dailyStats: nextStats })).catch(() => {});
    } catch {}
  }

  const total = questions.length;
  const percent = total ? Math.round((score / total) * 100) : 0;
  const current = questions[index];

  if (loading) return <main style={page}><div style={card}><div style={muted}>กำลังโหลดคลังคำศัพท์…</div></div></main>;

  if (words.length < 1) return <main style={page}><div style={card}>
    <div style={eyebrow}>听力训练 · LISTENING</div><h1 style={title}>ฝึกฟังภาษาจีน</h1>
    <p style={muted}>บันทึกคำศัพท์ใน Chajiw ก่อน แล้วกลับมาฝึกฟังได้เลย</p><a href="/" style={button}>← กลับ Chajiw</a>
  </div></main>;

  return <main style={page}><div style={{width:"100%",maxWidth:760}}>
    <a href="/" style={back}><ArrowLeft size={15}/> Chajiw</a>
    {!started ? <div style={card}>
      <div style={iconBox}><Headphones size={22}/></div>
      <div style={eyebrow}>听力训练 · SMART LISTENING</div>
      <h1 style={title}>{round ? "รอบนี้เสร็จแล้ว" : "ฝึกฟังให้มากกว่าแค่เลือกคำแปล"}</h1>
      <p style={muted}>ระบบจะปรับการฝึกจากคำศัพท์ที่คุณบันทึกไว้ และเก็บสถิติว่าคำไหนฟังยาก เพื่อใช้เป็นข้อมูลสำหรับการทบทวนต่อไป</p>

      {round > 0 && <div style={resultBox}><Trophy size={20}/><div><strong>{score} / {round}</strong><div style={muted}>ตอบถูก {percent}%</div></div></div>}

      <div style={modeGrid}>
        <button onClick={() => begin("meaning")} disabled={usable.length < 4} style={modeButton}>
          <ListChecks size={20}/><strong>ฟัง → เลือกความหมาย</strong><span>ระดับเริ่มต้น · 4 ตัวเลือก</span>
        </button>
        <button onClick={() => begin("dictation")} style={modeButton}>
          <Keyboard size={20}/><strong>ฟัง → พิมพ์คำจีน</strong><span>ระดับท้าทาย · ตรวจตัวอักษร</span>
        </button>
      </div>
      {usable.length < 4 && <div style={{...muted,marginTop:10}}>โหมดเลือกความหมายต้องมีอย่างน้อย 4 คำศัพท์</div>}
    </div> : <div style={card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
        <div style={eyebrow}>{mode === "meaning" ? "ฟัง → เลือกความหมาย" : "ฟัง → พิมพ์คำจีน"} · ข้อ {index+1}/{total}</div>
        <div style={{fontSize:13,fontWeight:700}}>คะแนน {score}</div>
      </div>
      <div style={progress}><div style={{width:`${((index+1)/total)*100}%`,height:"100%",background:C.seal}}/></div>

      <div style={listenBox}>
        <div style={muted}>ฟังโดยไม่มองคำจีนก่อน</div>
        <button onClick={() => speak(current.hanzi, .72)} style={listenButton}><Volume2 size={24}/> ฟังอีกครั้ง</button>
        {mode === "dictation" && <div style={{fontSize:12,color:C.faint}}>พิมพ์สิ่งที่ได้ยินเป็นภาษาจีน</div>}
      </div>

      {mode === "meaning" ? <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {choices.map(choice => {
          const correct = wordKey(choice) === wordKey(current);
          const picked = selected && wordKey(choice) === wordKey(selected);
          const bg = answered && correct ? "#EAF4EA" : answered && picked ? "#F8E9E7" : "#fffdf6";
          const border = answered && correct ? "#6C9B72" : answered && picked ? C.seal : C.cardEdge;
          return <button key={wordKey(choice)} onClick={() => checkAnswer(choice)} disabled={answered} style={{...choiceButton,background:bg,borderColor:border}}>
            <span style={{fontWeight:700}}>{choice.thai || choice.meaning || "ไม่ทราบความหมาย"}</span>
            {answered && <span style={{fontFamily:"'Noto Serif SC', serif",fontSize:15,color:C.inkSoft}}>{choice.hanzi}</span>}
          </button>;
        })}
      </div> : <div>
        <input autoFocus value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => {if(e.key==="Enter" && input.trim()) checkAnswer(input);}} disabled={answered} placeholder="พิมพ์คำจีนที่ได้ยิน…" style={dictationInput}/>
        <button onClick={() => input.trim() && checkAnswer(input)} disabled={answered || !input.trim()} style={{...primary,opacity:!input.trim()||answered?.5:1}}>ตรวจคำตอบ <ChevronRight size={16}/></button>
      </div>}

      {answered && <div style={{marginTop:14}}>
        <div style={{padding:12,borderRadius:5,background: results[results.length-1]?.correct ? "#EAF4EA" : "#F7F1E2",fontSize:13}}>
          {results[results.length-1]?.correct ? <><Check size={15} style={{verticalAlign:"-3px"}}/> ถูกต้อง</> : <>คำตอบที่ถูกคือ <strong>{current.hanzi}</strong></>}
          <div style={{marginTop:4,color:C.inkSoft}}>{current.pinyin} · {current.thai || current.meaning || ""}</div>
        </div>
        <button onClick={next} style={{...primary,marginTop:12}}>{index+1>=total ? "ดูผลคะแนน" : "ข้อต่อไป"} <ChevronRight size={16}/></button>
      </div>}
    </div>}
  </div></main>;
}

const page={minHeight:"100vh",background:"#F4EEDC",padding:"32px 18px",display:"flex",justifyContent:"center",fontFamily:"'Noto Sans Thai', sans-serif",color:C.ink};
const card={background:C.card,border:"1px solid "+C.cardEdge,borderRadius:7,padding:26,boxShadow:"0 8px 28px rgba(70,50,20,.06)"};
const title={fontFamily:"'Noto Serif Thai', serif",fontSize:30,margin:"7px 0 8px"};
const muted={color:C.inkSoft,fontSize:13,lineHeight:1.7};
const eyebrow={color:C.seal,fontSize:12,fontWeight:800,letterSpacing:".08em"};
const iconBox={width:48,height:48,borderRadius:6,background:"#F2E3BD",display:"grid",placeItems:"center",color:C.seal,marginBottom:15};
const button={display:"inline-block",marginTop:18,padding:"10px 15px",borderRadius:4,background:C.indigo,color:"#fff",textDecoration:"none",fontWeight:700,fontSize:13};
const back={display:"inline-flex",alignItems:"center",gap:5,color:C.inkSoft,textDecoration:"none",fontSize:13,marginBottom:14};
const primary={display:"flex",alignItems:"center",justifyContent:"center",gap:7,width:"100%",padding:"12px 16px",border:0,borderRadius:4,background:C.seal,color:"#F6EFD9",fontSize:14,fontWeight:700,cursor:"pointer",marginTop:18};
const progress={height:6,background:"#E0D5B7",borderRadius:5,overflow:"hidden",margin:"9px 0 20px"};
const listenBox={textAlign:"center",padding:"22px 10px 24px",background:"#FBF6E8",border:"1px solid "+C.cardEdge,borderRadius:6,marginBottom:14};
const listenButton={margin:"16px auto 8px",display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"14px 25px",border:"1px solid "+C.cardEdge,borderRadius:5,background:"#fffdf6",color:C.seal,fontWeight:800,cursor:"pointer"};
const choiceButton={minHeight:68,padding:12,border:"1px solid",borderRadius:5,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,cursor:"pointer",fontFamily:"'Noto Sans Thai', sans-serif"};
const resultBox={display:"flex",alignItems:"center",gap:12,background:"#F7F1E2",border:"1px solid "+C.cardEdge,borderRadius:5,padding:14,marginTop:18};
const modeGrid={display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:18};
const modeButton={display:"flex",flexDirection:"column",alignItems:"center",gap:7,padding:"18px 12px",border:"1px solid "+C.cardEdge,borderRadius:6,background:"#fffdf6",color:C.ink,cursor:"pointer",fontFamily:"'Noto Sans Thai', sans-serif"};
const dictationInput={width:"100%",boxSizing:"border-box",padding:"15px",fontFamily:"'Noto Serif SC', serif",fontSize:25,textAlign:"center",border:"1px solid "+C.cardEdge,borderRadius:5,background:"#fffdf6",color:C.ink,outline:"none"};
