// 江湖 (jiānghú) theme tokens — aged scroll / ink-and-seal palette.

export const C = {
  ink: "#211C16",
  inkSoft: "#4A4036",
  parchment: "#E8DCB8",
  parchmentDeep: "#DDCE9F",
  card: "#F6EFD9",
  cardEdge: "#C9B98A",
  seal: "#9E2B25",
  sealDeep: "#7A211D",
  gold: "#B8860B",
  jade: "#3F6B4F",
  indigo: "#2E4E7E",
  plum: "#6E3B5E",
  muted: "#8A7F63",
  faint: "#B4A87F",
};

// 境界 cultivation ranks, keyed by minimum saved-word count.
export const RANKS = [
  { min: 0, name: "凡人", th: "ปุถุชน", color: C.muted },
  { min: 10, name: "练气期", th: "ขั้นฝึกชี่", color: C.jade },
  { min: 30, name: "筑基期", th: "ขั้นวางรากฐาน", color: "#2F5A42" },
  { min: 60, name: "金丹期", th: "ขั้นแกนทอง", color: C.gold },
  { min: 100, name: "元婴期", th: "ขั้นกำเนิดวิญญาณ", color: C.plum },
  { min: 200, name: "化神期", th: "ขั้นแปรเทพ", color: "#3C7A9E" },
  { min: 400, name: "合体期", th: "ขั้นผสานกาย", color: C.indigo },
  { min: 800, name: "渡劫期", th: "ขั้นฟันฝ่ามหันตภัย", color: C.seal },
  { min: 1500, name: "飞升", th: "ขั้นเหาะสู่สวรรค์", color: C.gold },
];

export function rankFor(count) {
  let current = RANKS[0];
  let next = RANKS[1] || null;
  for (let i = 0; i < RANKS.length; i++) {
    if (count >= RANKS[i].min) {
      current = RANKS[i];
      next = RANKS[i + 1] || null;
    }
  }
  return { current, next };
}

export const PATTERN_TAGS = [
  "SVO พื้นฐาน",
  "ใช้ 把",
  "ใช้ 被",
  "是...的",
  "กริยาเรียงซ้อน",
  "ประโยคคำถาม",
  "ประโยคเปรียบเทียบ",
  "โครงสร้างเวลา/การคงอยู่",
  "อื่นๆ",
];

export function cardStyle(extra = {}) {
  return {
    background: C.card,
    border: `1px solid ${C.cardEdge}`,
    borderRadius: "4px",
    boxShadow: `0 1px 0 ${C.cardEdge}, inset 0 0 0 1px rgba(255,255,255,0.3)`,
    ...extra,
  };
}

export function sealButtonStyle(active, extra = {}) {
  return {
    background: active ? C.seal : C.card,
    color: active ? "#F6EFD9" : C.ink,
    border: `1px solid ${active ? C.sealDeep : C.cardEdge}`,
    borderRadius: "4px",
    fontWeight: 600,
    cursor: "pointer",
    ...extra,
  };
}
