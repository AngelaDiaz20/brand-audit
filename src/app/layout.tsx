import type { Metadata } from "next";
import './styles/globals.css';

export const metadata: Metadata = {
  title: "Sistema de Análisis IA",
  description: "Análisis automático de piezas gráficas publicitarias con IA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
