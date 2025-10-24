import "./globals.css";
import "../styles/theme.css";

export const metadata = { title: process.env.NEXT_PUBLIC_APP_NAME || "Course" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body className="bg-[hsl(var(--surface))] text-neutral-100">{children}</body>
    </html>
  );
}
