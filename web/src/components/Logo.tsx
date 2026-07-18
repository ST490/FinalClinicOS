import { ImgHTMLAttributes, useEffect, useState } from 'react';

export interface LogoProps extends ImgHTMLAttributes<HTMLImageElement> {
  variant: 'horizontal' | 'stacked' | 'icon-only' | 'wordmark-only';
  lightBg?: boolean; // If provided, overrides the automatic theme detection
}

export default function Logo({ variant, lightBg, className = '', style, ...props }: LogoProps) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    if (lightBg !== undefined) return;
    
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [lightBg]);

  const isLight = lightBg !== undefined ? lightBg : !isDark;

  let src = '';
  let minHeight = '24px';
  let aspectRatio = 'auto';

  switch (variant) {
    case 'horizontal':
      src = isLight ? '/lockup/lockup-horizontal-light.png' : '/lockup/lockup-horizontal-dark.png';
      aspectRatio = '161 / 30';
      minHeight = '24px';
      break;
    case 'stacked':
      src = isLight ? '/lockup/lockup-stacked-light.png' : '/lockup/lockup-stacked-dark.png';
      aspectRatio = '122 / 99';
      minHeight = '36px';
      break;
    case 'icon-only':
      src = isLight ? '/icon/app-icon-1024.png' : '/icon/app-icon-white-1024.png';
      aspectRatio = '1 / 1';
      minHeight = '16px';
      break;
    case 'wordmark-only':
      src = isLight ? '/wordmark/wordmark-standard.png' : '/wordmark/wordmark-allwhite.png';
      aspectRatio = '161 / 30';
      minHeight = '20px';
      break;
  }

  return (
    <img
      src={src}
      alt="CareMe Logo"
      className={className}
      style={{
        display: 'block',
        aspectRatio,
        minHeight,
        width: 'auto',
        height: 'auto',
        ...style,
      }}
      {...props}
    />
  );
}
