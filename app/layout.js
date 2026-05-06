import "./globals.css";

export const metadata = {
  title: "ChatStats — Kick chat analytics",
  description: "Real-time chat statistics for Kick.com channels",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-kick-dark text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
