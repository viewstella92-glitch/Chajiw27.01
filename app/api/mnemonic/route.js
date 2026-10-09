import { NextResponse } from "next/server";
import { callTextLLM } from "../../../lib/llm";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    // Accept both the original { word, chars } contract and the compact
    // { hanzi, pinyin, thai, components } contract used by MnemonicStory.
    const word = body?.word || {
      hanzi: body?.hanzi,
      pinyin: body?.pinyin,
      thai: body?.thai,
      example: body?.example,
    };
    if (!word?.hanzi || typeof word.hanzi !== "string") {
      return NextResponse.json({ error: "กรุณาระบุคำศัพท์ภาษาจีน" }, { status: 400 });
    }

    const inputChars = Array.isArray(body.chars) ? body.chars : body.components;
    const chars = Array.isArray(inputChars) ? inputChars.slice(0, 12) : [];
    const prompt = `คุณเป็นครูสอนภาษาจีนให้ผู้เรียนชาวไทย จงสร้างเครื่องมือช่วยจำสำหรับคำศัพท์นี้ โดยต้องไม่แต่งข้อมูลพินอินหรือความหมายที่ขัดกับข้อมูลที่ให้มา
คำศัพท์: ${word.hanzi}
พินอิน: ${word.pinyin || "ไม่ระบุ"}
ความหมายภาษาไทย: ${word.thai || "ไม่ระบุ"}
ข้อมูลตัวอักษร: ${JSON.stringify(chars)}
ประโยคตัวอย่างเดิม: ${word.example?.hanzi || ""}
ตอบเป็น JSON เท่านั้น โดยมีรูปแบบ:
{
 "title": "ชื่อเรื่องสั้นภาษาไทย",
 "story": "เรื่องช่วยจำสั้นๆ 2-4 ประโยคภาษาไทย เชื่อมภาพจำกับคำศัพท์อย่างเหมาะสม",
 "mnemonic": "เคล็ดจำหนึ่งประโยคที่โยงความหมายหรือองค์ประกอบจริง ไม่สร้างนิรุกติศาสตร์เท็จ",
 "breakdown": "คำอธิบายสั้นๆ ว่าภาพจำเชื่อมกับเสียงอ่านหรือความหมายอย่างไร"
}
หากองค์ประกอบของอักษรไม่ได้บ่งบอกความหมายจริง ให้บอกว่าเป็นเพียงภาพจำ ไม่ใช่ที่มาทางประวัติศาสตร์ ห้ามกล่าวอ้างเรื่องนิรุกติศาสตร์ที่ไม่มีหลักฐาน.`;

    const generated = await callTextLLM(prompt);
    const result = {
      keyword: `${word.hanzi}${word.pinyin ? " · " + word.pinyin : ""}${word.thai ? " · " + word.thai : ""}`,
      title: typeof generated.title === "string" ? generated.title : "เรื่องช่วยจำ",
      story: typeof generated.story === "string" ? generated.story : "",
      mnemonic: typeof generated.mnemonic === "string" ? generated.mnemonic : "",
      breakdown: typeof generated.breakdown === "string" ? generated.breakdown : "",
    };
    if (!result.story && !result.mnemonic) {
      return NextResponse.json({ error: "AI ส่งคำตอบกลับมาไม่ครบ กรุณาลองใหม่" }, { status: 502 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("mnemonic API error:", error);
    return NextResponse.json({ error: "สร้างคำช่วยจำไม่สำเร็จ ตรวจสอบการตั้งค่า GROQ_API_KEY แล้วลองอีกครั้ง" }, { status: 500 });
  }
}
