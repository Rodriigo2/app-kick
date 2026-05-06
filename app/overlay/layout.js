import "../globals.css";

export const metadata = { title: "Chat Overlay — ChatStats" };

export default function OverlayLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, background: "transparent" }}>
        {children}
      </body>
    </html>
  );
}
