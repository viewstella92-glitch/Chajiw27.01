import { NextResponse } from "next/server";
import { callTextLLM } from "../../../lib/llm";

export async function POST(req) {
  try {
    const { hanzi, pinyin } = await req.json();
    if (!hanzi) {
      return NextResponse.json({ error: "missing hanzi" }, { status: 400 });
    }
    const prompt = `สำหรับคำจีนนี้: "${hanzi}" (pinyin รวม: ${pinyin || ""})

ทำ 2 อย่างพร้อมกัน สำหรับตัวอักษรจีนแต่ละตัวในคำนี้ (ทีละตัว):

1) แยกส่วนประกอบของตัวอักษรตัวนั้น:
   - ตัวอักษรนั้น พินอิน และความหมายของอักษรเดี่ยวนั้น
   - ส่วนประกอบ (偏旁部首 / ราก) ที่ประกอบกันเป็นอักษรตัวนี้ แต่ละส่วนบอกตัวอักษรของส่วนนั้น พินอินถ้ามีเสียงอ่านเดี่ยว (ถ้าไม่มีให้ใส่ "-") และความหมายของส่วนนั้นๆ
   - ถ้าอักษรตัวนั้นเป็นอักษรพื้นฐานที่แยกต่อไม่ได้แล้ว ให้ส่ง components เป็น array ว่าง []

2) หาคำจีนอื่นๆ ที่ใช้ตัวอักษรตัวนั้นเป็นส่วนประกอบ (ไม่ใช่คำเดียวกับ "${hanzi}" เอง) มา 4-6 คำต่อตัวอักษร เป็นคำที่ใช้บ่อยในชีวิตประจำวัน

ตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่นนอก JSON:

{
  "chars": [
    {
      "hanzi": "ตัวอักษรจีนตัวนี้",
      "pinyin": "พินอินของอักษรตัวนี้",
      "meaning": "ความหมายของอักษรเดี่ยวนี้ เป็นภาษาไทย",
      "components": [
        { "hanzi": "ส่วนประกอบ", "pinyin": "พินอิน หรือ -", "meaning": "ความหมายของส่วนนี้ เป็นภาษาไทย" }
      ],
      "related": [
        { "hanzi": "คำจีนที่มีตัวอักษรนี้อยู่", "pinyin": "พินอินของคำนั้น", "meaning": "ความหมายสั้นๆ เป็นภาษาไทย" }
      ]
    }
  ]
}`;

    const parsed = await callTextLLM(prompt);
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
