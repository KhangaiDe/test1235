import localFont from 'next/font/local';

/**
 * TT Firs Text (TypeType). Licensed for web use on M Bank's own domains only —
 * see the Web-font-License.pdf that came with the font. Do not copy these files
 * to third-party hosts or public repositories.
 */
export const ttFirs = localFont({
  src: [
    { path: './tt-firs-text/TT_Firs_Text_Normal.woff2', weight: '400', style: 'normal' },
    { path: './tt-firs-text/TT_Firs_Text_Medium.woff2', weight: '500', style: 'normal' },
    { path: './tt-firs-text/TT_Firs_Text_DemiBold.woff2', weight: '600', style: 'normal' },
    { path: './tt-firs-text/TT_Firs_Text_Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-tt-firs',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
});
