import { NextResponse } from "next/server";
import { callTextLLM } from "../../../lib/llm";

export async function POST(req) {
  try {
    const body = await req.json();
    const hanzi = typeof body.hanzi === "string" ? body.hanzi.trim().slice(0, 10) : "";
    if (!hanzi) {
      return NextResponse.json({ error: "missing hanzi" }, { status: 400 });
    }

    const pinyin = String(body.pinyin || "-").slice(0, 40);
    const thai = String(body.thai || "-").slice(0, 80);
    const parts = Array.isArray(body.components)
      ? body.components
          .slice(0, 8)
          .map((c) => `${String(c.hanzi || "").slice(0, 4)} (${String(c.meaning || "").slice(0, 40)})`)
          .join(", ")
      : "";

    const prompt = `คุณเป็นครูสอนภาษาจีนที่สร้างคำช่วยจำให้นักเรียนไทย
ตัวอักษรหรือคำ: ${hanzi} (พินอิน ${pinyin}) ความหมาย: ${thai}
ส่วนประกอบ: ${parts || "ไม่มีข้อมูล"}

สร้างเรื่องสั้นภาษาไทย 2-3 ประโยค ที่เชื่อมความหมายของส่วนประกอบเข้าด้วยกัน
เพื่อให้จำความหมายของ ${hanzi} ได้ และสร้างคำคล้องจองหรือคำช่วยจำสั้นๆ 1 บรรทัด

ตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่นนอก JSON ตามรูปแบบนี้:
{"story": "เรื่องสั้น", "keyword": "คำช่วยจำ"}`;

    const parsed = await callTextLLM(prompt);
    if (typeof parsed?.story !== "string") {
      return NextResponse.json({ error: "invalid model output" }, { status: 502 });
    }
    return NextResponse.json({
      story: parsed.story,
      keyword: typeof parsed.keyword === "string" ? parsed.keyword : "",
    });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
