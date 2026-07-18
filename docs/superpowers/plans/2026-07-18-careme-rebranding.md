# CareMe Rebranding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the clinic os application with the CareMe identity, including color palette updates, Zona Pro default font config check, reusable `<Logo />` component, and layout updates.

**Architecture:** Use CSS variables in `index.css` to override Tailwind color variables surgically. Update active components and sidebar styles to use the new Teal color accent. Use a reusable React `<Logo />` component in pages to swap correct assets and control aspect-ratios.

**Tech Stack:** React 19, Tailwind CSS v4, Vite 8, TypeScript 6

## Global Constraints
- Navy color value: `#0E1733`
- Teal color value: `#278289`
- Keep whitelabel configurations intact (do not touch database values or custom clinic theme fields).
- Enforce brand aspect ratios and minimum legibility rules (e.g., 16px minimum height for icon-only variant) inside the `<Logo />` component.
- Touch only styling-related files and layout files; do not touch business logic or DB schemas.

---

### Task 1: Rebrand Color Tokens in CSS Variables

**Files:**
- Modify: [index.css](file:///c:/Users/Sufiyan/Documents/Files'/My Sufiyan/My Code/FINAL clinic os/web/src/index.css)

**Interfaces:**
- Produces: CSS color variables and utility classes in Tailwind theme mapping primary to Navy (#0E1733) and defining Teal (#278289).

- [ ] **Step 1: Modify `index.css` color definitions**
  Replace the light-mode `--color-primary-*` scale with a custom Navy scale, and add a custom `--color-teal-*` scale.
  Update `--color-navy` and `--color-teal` as base variables.
  Update the `.dark` mode block to map primary to Navy and teal to the brand Teal.

  Replace lines 26-37 in `index.css`:
  ```css
    --color-navy: #0E1733;
    --color-teal: #278289;

    --color-primary-50: #f0f2f5;
    --color-primary-100: #dce1e7;
    --color-primary-200: #bcc8d4;
    --color-primary-300: #9caec0;
    --color-primary-400: #7c95ad;
    --color-primary-500: #4c6c8c;
    --color-primary-600: #0E1733;
    --color-primary-700: #0b1229;
    --color-primary-800: #080d1e;
    --color-primary-900: #050812;

    --color-teal-50: #f0fdfa;
    --color-teal-100: #ccfbf1;
    --color-teal-200: #99f6e4;
    --color-teal-300: #5eead4;
    --color-teal-400: #2dd4bf;
    --color-teal-500: #278289;
    --color-teal-600: #1f686e;
    --color-teal-700: #185055;
    --color-teal-800: #10373a;
    --color-teal-900: #0b2427;
  ```

  Also replace the `.dark` class variables in `index.css` (lines 71-80):
  ```css
    --color-primary-50: #1a2238;
    --color-primary-100: #202b48;
    --color-primary-200: #29385c;
    --color-primary-300: #354977;
    --color-primary-400: #466099;
    --color-primary-500: #597cbe;
    --color-primary-600: #0E1733;
    --color-primary-700: #16224f;
    --color-primary-800: #080e22;
    --color-primary-900: #040711;
  ```

- [ ] **Step 2: Run typecheck to verify styles**
  Run: `npm run typecheck` in `web` folder.
  Expected: PASS

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add web/src/index.css
  git commit -m "style: rebrand primary and teal color tokens in CSS variable themes"
  ```

---

### Task 2: Active Navigation State styles update

**Files:**
- Modify: [index.css](file:///c:/Users/Sufiyan/Documents/Files'/My Sufiyan\My Code\FINAL clinic os/web/src/index.css)

**Interfaces:**
- Consumes: CSS theme classes from Task 1.

- [ ] **Step 1: Update active navigation classes**
  Since active states should use Teal, update the `.sidebar-link` and `.sidebar-link.active` selectors in `index.css` (lines 186-199) to use `teal` classes:
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

- [ ] **Step 2: Update dark mode glow rule**
  Update the `--glow-primary` variable to use rgb of Teal `#278289` (39, 130, 137):
  ```css
    --glow-primary: 0 0 0 1px rgba(39, 130, 137, 0.25), 0 2px 14px -2px rgba(39, 130, 137, 0.4);
  ```

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add web/src/index.css
  git commit -m "style: update sidebar active classes and glow outline to use Teal color"
  ```

---

### Task 3: Create Reusable `<Logo />` Component

**Files:**
- Create: [Logo.tsx](file:///c:/Users/Sufiyan/Documents/Files'/My Sufiyan/My Code/FINAL clinic os/web/src/components/Logo.tsx)

**Interfaces:**
- Produces: `<Logo />` component exporting type definition `LogoProps` and default rendering function.

- [ ] **Step 1: Create `web/src/components/Logo.tsx`**
  Implement the component with responsive mode and height-constraining style parameters:
  ```tsx
  import React from 'react';

  export interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
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
  ```

- [ ] **Step 2: Commit**
  Run:
  ```bash
  git add web/src/components/Logo.tsx
  git commit -m "feat: create reusable Logo component with variant switching and bounds"
  ```

---

### Task 4: Rebrand Sidebar Layout

**Files:**
- Modify: [Sidebar.tsx](file:///c:/Users/Sufiyan/Documents/Files'/My Sufiyan/My Code/FINAL clinic os/web/src/components/layout/Sidebar.tsx)

**Interfaces:**
- Consumes: `<Logo />` component from Task 3.

- [ ] **Step 1: Replace stethoscope logo block in `Sidebar.tsx`**
  Import `Logo` and replace the logo block (lines 62-69):
  ```tsx
  import Logo from '../Logo';
  ```
  And change:
  ```tsx
  <Link to="/" className="flex items-center gap-2.5 group overflow-hidden">
    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow shrink-0">
      <Stethoscope className="w-4.5 h-4.5 text-white" />
    </div>
    <span className="text-sm font-bold text-text-primary tracking-tight truncate max-w-[160px]">
      {organization?.name || 'Careme'}
    </span>
  </Link>
  ```
  to:
  ```tsx
  <Link to="/" className="flex items-center gap-2.5 group overflow-hidden">
    <Logo variant="horizontal" className="h-7" />
  </Link>
  ```

- [ ] **Step 2: Commit**
  Run:
  ```bash
  git add web/src/components/layout/Sidebar.tsx
  git commit -m "style: replace Sidebar logo placeholder with rebranded horizontal Logo component"
  ```

---

### Task 5: Rebrand Auth and Signin Pages

**Files:**
- Modify: [LoginPage.tsx](file:///c:/Users/Sufiyan/Documents/Files'/My Sufiyan/My Code/FINAL clinic os/web/src/pages/LoginPage.tsx)
- Modify: [SignupPage.tsx](file:///c:/Users/Sufiyan/Documents/Files'/My Sufiyan/My Code/FINAL clinic os/web/src/pages/SignupPage.tsx)
- Modify: [AcceptInvitePage.tsx](file:///c:/Users/Sufiyan/Documents/Files'/My Sufiyan/My Code/FINAL clinic os/web/src/pages/AcceptInvitePage.tsx)

**Interfaces:**
- Consumes: `<Logo />` component from Task 3.

- [ ] **Step 1: Modify `LoginPage.tsx`**
  Import `Logo`:
  ```tsx
  import Logo from '../components/Logo';
  ```
  Replace lines 79-84:
  ```tsx
  <div className="flex items-center gap-2.5">
    <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-sm">
      <Stethoscope className="w-5 h-5 text-white" />
    </div>
    <span className="text-xl font-bold text-text-primary tracking-tight">Care<span className="text-primary-600">me</span></span>
  </div>
  ```
  with:
  ```tsx
  <Logo variant="horizontal" className="h-7" />
  ```
  Replace lines 193-195:
  ```tsx
  <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto border border-white/20 shadow-lg">
    <Stethoscope className="w-8 h-8 text-primary-400" />
  </div>
  ```
  with:
  ```tsx
  <Logo variant="icon-only" lightBg={false} className="h-16 w-16 mx-auto" />
  ```

- [ ] **Step 2: Modify `SignupPage.tsx`**
  Import `Logo`:
  ```tsx
  import Logo from '../components/Logo';
  ```
  Replace lines 83-88:
  ```tsx
  <div className="flex items-center gap-2.5">
    <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-sm">
      <Stethoscope className="w-5 h-5 text-white" />
    </div>
    <span className="text-xl font-bold text-text-primary tracking-tight">Care<span className="text-primary-600">me</span></span>
  </div>
  ```
  with:
  ```tsx
  <Logo variant="horizontal" className="h-7" />
  ```
  Replace lines 164-166:
  ```tsx
  <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto border border-white/20 shadow-lg">
    <Stethoscope className="w-8 h-8 text-primary-400" />
  </div>
  ```
  with:
  ```tsx
  <Logo variant="icon-only" lightBg={false} className="h-16 w-16 mx-auto" />
  ```

- [ ] **Step 3: Modify `AcceptInvitePage.tsx`**
  Import `Logo`:
  ```tsx
  import Logo from '../components/Logo';
  ```
  Replace lines 95-100:
  ```tsx
  <div className="flex items-center gap-2.5">
    <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-sm">
      <Stethoscope className="w-5 h-5 text-white" />
    </div>
    <span className="text-xl font-bold text-text-primary tracking-tight">Care<span className="text-primary-600">me</span></span>
  </div>
  ```
  with:
  ```tsx
  <Logo variant="horizontal" className="h-7" />
  ```
  Replace lines 171-173:
  ```tsx
  <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto border border-white/20 shadow-lg">
    <Stethoscope className="w-8 h-8 text-primary-400" />
  </div>
  ```
  with:
  ```tsx
  <Logo variant="icon-only" lightBg={false} className="h-16 w-16 mx-auto" />
  ```

- [ ] **Step 4: Commit**
  Run:
  ```bash
  git add web/src/pages/LoginPage.tsx web/src/pages/SignupPage.tsx web/src/pages/AcceptInvitePage.tsx
  git commit -m "style: replace placeholder Stethoscope and wordmarks with Logo component in Auth pages"
  ```

---

### Task 6: Rebrand Favicon and Metadata Links

**Files:**
- Modify: [index.html](file:///c:/Users/Sufiyan/Documents/Files'/My Sufiyan/My Code/FINAL clinic os/web/index.html)

**Interfaces:**
- Consumes: Favicon assets inside `/favicon/` and `/icon/` directories.

- [ ] **Step 1: Replace Favicon and Touch Icon Links**
  Change line 5 in `web/index.html`:
  ```html
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  ```
  to:
  ```html
  <link rel="icon" type="image/x-icon" href="/favicon/favicon.ico" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32.png" />
  <link rel="icon" type="image/png" sizes="64x64" href="/favicon/favicon-64.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/icon/app-icon-180.png" />
  ```

- [ ] **Step 2: Commit**
  Run:
  ```bash
  git add web/index.html
  git commit -m "style: update index.html to reference the correct favicon.ico and app touch icons"
  ```

---

### Task 7: Build and Lint Verification

- [ ] **Step 1: Clean compile and check for type correctness**
  Run: `npm run typecheck` in the `web` folder.
  Expected: PASS

- [ ] **Step 2: Run frontend linters**
  Run: `npm run lint` in `web` folder.
  Expected: PASS
