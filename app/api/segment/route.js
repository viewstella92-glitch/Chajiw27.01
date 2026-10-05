import { NextResponse } from "next/server";
import { callTextLLM } from "../../../lib/llm";
import { PATTERN_TAGS } from "../../../lib/theme";

const ROLE_ORDER = [
  "ประธาน",
  "กริยาหลัก",
  "กริยาช่วย",
  "กรรม",
  "ส่วนขยาย",
  "ขยายเวลา/สถานที่",
  "คำเชื่อม",
  "อนุภาค",
  "อื่นๆ",
];

export async function POST(req) {
  try {
    const { text } = await req.json();
    if (!text || !text.trim()) {
      return NextResponse.json({ error: "missing text" }, { status: 400 });
    }
    const roleList = ROLE_ORDER.map((r) => `"${r}"`).join(", ");
    const tagList = PATTERN_TAGS.map((t) => `"${t}"`).join(", ");
    const prompt = `แยกประโยคภาษาจีนต่อไปนี้ออกเป็น "คำ" (word segmentation ไม่ใช่การแยกทีละอักษร/พยางค์) พร้อมวิเคราะห์ไวยากรณ์ แล้วตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่นนอก JSON

ประโยค: "${text.trim()}"

รูปแบบ JSON ที่ต้องการ:
{
  "translation": "คำแปลไทยของทั้งประโยค แบบเป็นธรรมชาติ",
  "pattern": "อธิบายโครงสร้างไวยากรณ์ของประโยคนี้สั้นๆ เป็นภาษาไทย 1-2 ประโยค",
  "patternTag": "แท็กหมวดโครงสร้างไวยากรณ์หลักของประโยคนี้ เลือกจากรายการนี้เท่านั้น (เลือกแท็กเดียวที่ตรงที่สุด): [${tagList}]",
  "hsk": "ระดับ HSK โดยประมาณของประโยคนี้ทั้งประโยค ตอบเป็นตัวเลข 1-6 เท่านั้น (ประเมินจากคำศัพท์/ไวยากรณ์ที่ยากที่สุดในประโยค ตามมาตรฐาน HSK เก่า 1-6 ระดับ)",
  "words": [
    {
      "hanzi": "ตัวอักษรจีนของคำนี้",
      "pinyin": "พินอินพร้อมวรรณยุกต์ เช่น wǒ",
      "tone": ตัวเลข 1-5 (1-4 คือวรรณยุกต์หลัก 5 คือเสียงเบา),
      "thai": "คำแปลไทยสั้นๆ ของคำนี้",
      "hsk": "ระดับ HSK ของคำนี้ ตอบเป็นตัวเลข 1-6 หรือ unknown",
      "pos": "ชนิดคำแบบสั้นๆ เป็นภาษาไทย",
      "role": "หน้าที่ไวยากรณ์ของคำนี้ในประโยคนี้ เลือกจากรายการนี้เท่านั้น: [${roleList}]",
      "example": {
        "hanzi": "ประโยคตัวอย่างอื่นที่ใช้คำนี้",
        "pinyin": "พินอินของประโยคตัวอย่าง",
        "thai": "คำแปลไทยของประโยคตัวอย่าง"
      }
    }
  ]
}

แยกคำให้ถูกต้องตามหลักภาษาศาสตร์จีน เช่น 图书馆 ต้องเป็นคำเดียว ไม่ใช่ 图/书/馆 แยกกัน`;

    const parsed = await callTextLLM(prompt);
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
