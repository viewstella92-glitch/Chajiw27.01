export const metadata = {
  title: "拆句 江湖 — ตำรับยุทธ์แยกประโยคจีน",
  description: "แยกประโยคภาษาจีนออกเป็นคำ พร้อมพินอิน วรรณยุกต์ คำแปล และไวยากรณ์",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "拆句 江湖 — ตำรับยุทธ์แยกประโยคจีน",
    description: "แยกประโยคภาษาจีนออกเป็นคำ พร้อมพินอิน วรรณยุกต์ คำแปล และไวยากรณ์",
    type: "website",
    locale: "th_TH",
  },
  twitter: {
    card: "summary",
    title: "拆句 江湖 — ตำรับยุทธ์แยกประโยคจีน",
    description: "แยกประโยคภาษาจีนออกเป็นคำ พร้อมพินอิน วรรณยุกต์ คำแปล และไวยากรณ์",
  },
};

export const viewport = {
  themeColor: "#9E2B25",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;700;900&family=Noto+Serif+Thai:wght@500;600;700&family=Noto+Sans+Thai:wght@400;500;600&family=Inter:wght@400;500;600&display=swap"
        />
      </head>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
