import { NextResponse } from "next/server";
import { callTextLLM } from "../../../lib/llm";

export async function POST(req) {
  try {
    const { targetWord, sentence } = await req.json();
    if (!targetWord || !sentence || !sentence.trim()) {
      return NextResponse.json({ error: "missing targetWord or sentence" }, { status: 400 });
    }
    const prompt = `ผู้เรียนภาษาจีนกำลังฝึกแต่งประโยคโดยใช้คำว่า "${targetWord}" ประโยคที่เขาแต่งคือ: "${sentence.trim()}"

ช่วยตรวจสอบว่า:
1) ประโยคนี้ใช้คำ "${targetWord}" ถูกต้องตามความหมาย/หลักไวยากรณ์หรือไม่
2) มีจุดที่ผิดไวยากรณ์ / คำศัพท์ / ลำดับคำ ตรงไหนบ้าง (ถ้ามี)
3) ให้คะแนนความถูกต้องโดยรวมเป็น "ดีมาก", "ใช้ได้", หรือ "ควรแก้ไข"

ตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่นนอก JSON:

{
  "verdict": "ดีมาก หรือ ใช้ได้ หรือ ควรแก้ไข",
  "usesTargetCorrectly": true หรือ false,
  "feedback": "คำอธิบายสั้นๆ เป็นภาษาไทยว่าประโยคนี้ดีหรือผิดตรงไหน เขียนให้กำลังใจแต่ตรงไปตรงมา",
  "corrected": "ประโยคที่แก้ไขให้ถูกต้องแล้ว (ถ้าประโยคเดิมถูกต้องอยู่แล้ว ให้ใส่ประโยคเดิม)",
  "correctedPinyin": "พินอินของประโยคที่แก้ไขแล้ว",
  "correctedMeaning": "คำแปลไทยของประโยคที่แก้ไขแล้ว"
}`;

    const parsed = await callTextLLM(prompt);
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
