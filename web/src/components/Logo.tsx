import { ImgHTMLAttributes } from 'react';

export interface LogoProps extends ImgHTMLAttributes<HTMLImageElement> {
  variant: 'horizontal' | 'stacked' | 'icon-only' | 'wordmark-only';
  lightBg?: boolean; // Default true. False represents dark background (white logo variant)
}

export default function Logo({ variant, lightBg = true, className = '', style, ...props }: LogoProps) {
  let src = '';
  let minHeight = '24px';
  let aspectRatio = 'auto';

  switch (variant) {
    case 'horizontal':
      src = lightBg ? '/lockup/lockup-horizontal-light.png' : '/lockup/lockup-horizontal-dark.png';
      aspectRatio = '161 / 30';
      minHeight = '24px';
      break;
    case 'stacked':
      src = lightBg ? '/lockup/lockup-stacked-light.png' : '/lockup/lockup-stacked-dark.png';
      aspectRatio = '122 / 99';
      minHeight = '36px';
      break;
    case 'icon-only':
      src = lightBg ? '/icon/app-icon-1024.png' : '/icon/app-icon-white-1024.png';
      aspectRatio = '1 / 1';
      minHeight = '16px';
      break;
    case 'wordmark-only':
      src = lightBg ? '/wordmark/wordmark-standard.png' : '/wordmark/wordmark-allwhite.png';
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
