import "./globals.css";

export const metadata = { title: process.env.NEXT_PUBLIC_APP_NAME || "Course" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body className="bg-neutral-950 text-neutral-100">{children}</body>
    </html>
  );
}
