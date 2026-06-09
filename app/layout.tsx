import React from 'react';
import '@/app/globals.css'; // Substitua pelo caminho correto do seu CSS global (Tailwind)

export const metadata = {
  title: 'CRONOKA',
  description: 'Sistema de Cronometragem Esportiva',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="bg-black text-white">
      <body className="antialiased min-h-screen bg-black">
        {children}
      </body>
    </html>
  );
}