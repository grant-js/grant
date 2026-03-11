import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Config',
  description: 'Visualize and manage environment configuration across the Grant platform monorepo.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||'system';var resolved=t==='dark'||t==='light'?t:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',resolved);}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <div className="main-container">{children}</div>
      </body>
    </html>
  );
}
