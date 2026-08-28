import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Combogó Meet — chamadas temporárias, sem conta",
  description:
    "Crie uma sala de videochamada temporária, sem cadastro. Voz, vídeo, tela e transcrição automática. A sala se apaga quando a chamada termina.",
};

// Aplica o tema salvo antes do primeiro paint, evitando o "flash" de tema errado.
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('combogo-theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
