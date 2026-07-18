# Design Document: CareMe Rebranding Implementation

Applying the CareMe brand system across the clinic os multi-tenant SaaS application.

## 1. Objectives & Success Criteria
- **Consistent Branding**: Replace all existing references to the old ClinicOS branding (purple/emerald color palette, icons, default font-faces) with CareMe tokens and assets.
- **Design Tokens Integration**: Define custom Tailwind CSS / CSS variables as the single source of truth for color and typography.
- **Aspect-Ratio & Legibility Safeguards**: Create a robust `<Logo />` component that correctly dynamically swaps branding assets and prevents size degradation.
- **Surgical Execution**: Avoid modifying business logic, databases, or role hierarchies, touching only styling-relevant layers.

---

## 2. Brand Tokens & Assets Map

### Colors
- **Navy**: `#0E1733`
  - Primary button background, primary text headers, sidebar border contrast base.
  - Placed as `--color-navy` and mapped as primary `--color-primary-600` inside Tailwind.
- **Teal**: `#278289`
  - Active states, hover indicators, inline links.
  - Placed as `--color-teal` and mapped to active components.

### Typeface
- **Zona Pro** (Bold + ExtraLight)
  - Configured as the default font family (`--font-sans`). Done already in `index.css`.

### Assets Map
The rebranding assets are loaded from `/careme-brand-assets` and referenced directly through `/public/` on compile/build:
1. **Favicon**:
   - Primary: `/favicon/favicon.ico`
   - Sizes: `/favicon/favicon-16.png`, `/favicon/favicon-32.png`, `/favicon/favicon-64.png`
2. **App Icons**:
   - `/icon/app-icon-1024.png` (Navy background, primary)
   - `/icon/app-icon-teal-1024.png` (Teal background, secondary)
   - `/icon/app-icon-white-1024.png` (White background, light-UI variant)
3. **Lockups (Icon + Wordmark)**:
   - Horizontal: `/lockup/lockup-horizontal-light.png` (Navy text for light backgrounds), `/lockup/lockup-horizontal-dark.png` (White text for dark backgrounds)
   - Stacked: `/lockup/lockup-stacked-light.png` (Navy text), `/lockup/lockup-stacked-dark.png` (White text)
4. **Wordmarks**:
   - Default: `/wordmark/wordmark-standard.png` (Navy "Care" + Teal "Me")
   - All White: `/wordmark/wordmark-allwhite.png`
   - All Navy: `/wordmark/wordmark-allnavy.png`

---

## 3. Technical Design

### Logo Component
We will build `<Logo />` at `web/src/components/Logo.tsx`:
```tsx
import React from 'react';

interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
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
      aspectRatio = '161 / 30'; // exact dimensions from asset design
      minHeight = '24px';
      break;
    case 'stacked':
      src = lightBg ? '/lockup/lockup-stacked-light.png' : '/lockup/lockup-stacked-dark.png';
      aspectRatio = '122 / 99';
      minHeight = '36px';
      break;
    case 'icon-only':
      // The primary app icon on solid background
      src = lightBg ? '/icon/app-icon-1024.png' : '/icon/app-icon-white-1024.png';
      aspectRatio = '1 / 1';
      minHeight = '16px'; // from brand guidelines
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
```

### Color Variables Structure (`index.css`)
We will rewrite `--color-primary-*` values to be based on Navy (`#0E1733`), and define `--color-teal-*` values based on Teal (`#278289`).
For active sidebar styles:
```css
.sidebar-link {
  @apply flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
         text-text-secondary transition-all duration-200 ease-out
         hover:bg-teal-50 hover:text-teal-700;
}
.sidebar-link.active {
  @apply bg-teal-50 text-teal-700 shadow-sm;
}
.sidebar-link.active .sidebar-icon {
  @apply text-teal-600;
}
```

---

## 4. Proposed Changes list

### 1. `web/src/index.css`
- Update design tokens for primary palette to match Navy (`#0E1733`).
- Define Teal (`#278289`) variables.
- Update active state selector rules (sidebar hover/active states) to consume Teal variables instead of Navy.

### 2. `web/src/components/Logo.tsx` [NEW]
- Create the reusable brand-compliant logo switching component.

### 3. `web/src/components/layout/Sidebar.tsx`
- Replace clinic placeholder icon/name with `<Logo variant="horizontal" className="h-7" />`.

### 4. `web/src/pages/LoginPage.tsx`
- Replace left-column header placeholder with `<Logo variant="horizontal" className="h-7" />`.
- Replace right-column backdrop icon placeholder with `<Logo variant="icon-only" lightBg={false} className="h-16 w-16" />`.

### 5. `web/src/pages/SignupPage.tsx`
- Replace left-column header placeholder with `<Logo variant="horizontal" className="h-7" />`.
- Replace right-column backdrop icon placeholder with `<Logo variant="icon-only" lightBg={false} className="h-16 w-16" />`.

### 6. `web/src/pages/AcceptInvitePage.tsx`
- Replace left-column header placeholder with `<Logo variant="horizontal" className="h-7" />`.
- Replace right-column backdrop icon placeholder with `<Logo variant="icon-only" lightBg={false} className="h-16 w-16" />`.

### 7. `web/index.html`
- Replace favicon references with `/favicon/favicon.ico` and standard high-density PNG assets from the folder.

---

## 5. Verification & Testing
- Compile/Build the frontend code to ensure zero TypeScript/linter errors.
- Run a scan on the output to locate any leftover occurrences of hardcoded colors (like purple, emerald, or default colors) in branding-relevant areas.
