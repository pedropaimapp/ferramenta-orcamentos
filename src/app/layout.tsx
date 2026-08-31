import { Plus_Jakarta_Sans, Inter } from 'next/font/google';
import { SupabaseAuthListener } from '@/components/auth/SupabaseAuthListener';
import './globals.css';

const heading = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-heading',
  display: 'swap',
});

const body = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata = { title: 'Ferramenta de Orçamentos · Top Stop' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${heading.variable} ${body.variable}`}>
      <body className="bg-porto-offwhite font-sans text-porto-black antialiased">
        <SupabaseAuthListener />
        {children}
      </body>
    </html>
  );
}
