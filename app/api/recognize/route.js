import { NextResponse } from "next/server";

const MODEL_CANDIDATES = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-3.5-flash-lite", "gemini-flash-latest"];

export async function POST(req) {
  try {
    const { image } = await req.json();
    if (!image) {
      return NextResponse.json({ error: "missing image" }, { status: 400 });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("missing GEMINI_API_KEY on server");

    const prompt = `ภาพนี้คือลายมือเขียนตัวอักษรจีน 1 ตัว ที่ถูกครอปให้เต็มภาพและขยายใหญ่แล้ว (อาจเขียนไม่ครบทุกขีด หรือเป็นแค่ส่วนหนึ่ง/ขีดเดียวของตัวอักษรก็ได้ เช่น 一 丨 丿 亅 ก็นับเป็นคำตอบที่ถูกต้องได้ถ้ารูปทรงตรงกัน)

พิจารณาจำนวนขีด สัดส่วน และโครงสร้างโดยรวม แล้วทายตัวอักษรจีนที่ใกล้เคียงที่สุด 3-5 ตัว เรียงจากน่าจะใช่มากที่สุดไปน้อยที่สุด เน้นตัวอักษรที่ใช้บ่อยในชีวิตประจำวันก่อน

ตอบเป็น JSON เท่านั้น:
{"candidates": [{"hanzi": "ตัวอักษร", "pinyin": "พินอิน", "meaning": "ความหมายสั้นๆ เป็นภาษาไทย"}]}

ถ้าดูไม่ออกเลยว่าเป็นตัวอะไร ให้ส่ง candidates เป็น array ว่าง []`;

    let lastError = null;
    for (const model of MODEL_CANDIDATES) {
      try {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { inline_data: { mime_type: "image/png", data: image } },
                    { text: prompt },
                  ],
                },
              ],
              generationConfig: { responseMimeType: "application/json" },
            }),
          }
        );
        if (!r.ok) {
          const errText = await r.text();
          if (r.status === 404 || r.status === 429) {
            lastError = new Error(`Gemini error ${r.status}: ${errText}`);
            continue;
          }
          throw new Error(`Gemini error ${r.status}: ${errText}`);
        }
        const data = await r.json();
        const raw =
          data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
        const clean = raw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        return NextResponse.json(parsed);
      } catch (e) {
        lastError = e;
        if (!/404|429/.test(String(e.message || ""))) throw e;
      }
    }
    throw lastError || new Error("all Gemini model candidates failed");
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
