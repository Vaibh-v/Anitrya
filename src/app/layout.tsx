import "./globals.css";

export const metadata = {
  title: "Anitrya",
  description: "Analytics intelligence system"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}