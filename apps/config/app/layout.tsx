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
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t)}else if(window.matchMedia('(prefers-color-scheme:dark)').matches){document.documentElement.setAttribute('data-theme','dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <div className="main-container">{children}</div>
      </body>
    </html>
  );
}
