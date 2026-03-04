# Don Fiapo - Style Guide

This document outlines the design system and styling guidelines for the Don Fiapo project. The design follows the "Royal Theme" utilizing a palette of premium colors to convey power, elegance, and silence.

## 1. Color Palette

### Core Colors
| Token | Variable | Hex | Description |
|-------|----------|-----|-------------|
| **Background** | `--background` | `#14110E` | Charcoal Black (Main Background) |
| **Foreground** | `--foreground` | `#EFE4C8` | Warm Beige (Long Text) |
| **Card** | `--card` | `#2B1E14` | Dark Coffee Brown (Cards/Sections) |
| **Card Foreground** | `--card-foreground` | `#EFE4C8` | Warm Beige (Card Text) |
| **Primary** | `--primary` | `#C9A65B` | Deep Gold (Buttons/CTAs) |
| **Primary Foreground** | `--primary-foreground` | `#14110E` | Charcoal Black |
| **Secondary** | `--secondary` | `#2B1E14` | Dark Coffee Brown |
| **Secondary Foreground** | `--secondary-foreground` | `#C9A65B` | Deep Gold |
| **Muted** | `--muted` | `#1A1612` | Darker than background |
| **Muted Foreground** | `--muted-foreground` | `#B89E6A` | Dark Sand (Icons/Dividers) |
| **Accent** | `--accent` | `#C9A65B` | Deep Gold |
| **Destructive** | `--destructive` | `#8B0000` | Deep Red |
| **Border** | `--border` | `#3A2A1C` | Subtle Brown Border |

### Brand Colors (Custom)
| Name | Variable | Hex | Usage |
|------|----------|-----|-------|
| **Golden** | `--golden` | `#E2C48A` | Aged Gold (Titles, Hovers) |
| **Golden Deep** | `--golden-deep` | `#C9A65B` | Deep Gold (Hover, Focus, Selection) |
| **Cream** | `--cream` | `#EFE4C8` | Warm Beige |
| **Sand** | `--sand` | `#B89E6A` | Dark Sand |

---

## 2. Typography

### Functions
- **Headings (h1-h6)**: Styled with `--golden` (#E2C48A) to emphasize titles.
- **Body Text**: Uses `--foreground` (#EFE4C8) for readability on dark backgrounds.

### Fonts
- **Sans Serif**: `var(--font-montserrat)`, system-ui, sans-serif
- **Display**: `var(--font-display)`, Georgia, serif

---

## 3. Visual Effects

### Gradients
- **Text Gradient Gold**: Used for special text effects.
  ```css
  background: linear-gradient(135deg, #E2C48A 0%, #C9A65B 50%, #E2C48A 100%);
  ```
  Class: `.text-gradient-gold`

### Shadows & Glows
- **Royal Glow**: Subtle elegant glow.
  ```css
  box-shadow: 0 0 20px rgba(201, 166, 91, 0.2), 0 0 40px rgba(201, 166, 91, 0.05);
  ```
  Class: `.glow-gold`

- **Card Hover**: Lifts the card and adds a shadow.
  ```css
  transform: translateY(-2px);
  box-shadow: 0 10px 40px rgba(11, 9, 7, 0.4);
  border-color: var(--golden-deep);
  ```
  Class: `.card-hover`

---

## 4. Components

### Button
The `Button` component uses the following variants:

- **Default**: `bg-golden text-background hover:bg-golden/90 shadow-lg shadow-golden/20`
- **Destructive**: `bg-burgundy text-foreground hover:bg-burgundy/90` (Note: ensure `bg-burgundy` is defined in Tailwind config or CSS)
- **Outline**: `border-2 border-golden bg-transparent text-golden hover:bg-golden hover:text-background`
- **Secondary**: `bg-card text-foreground hover:bg-card/80 border border-border`
- **Ghost**: `hover:bg-card hover:text-foreground`
- **Link**: `text-golden underline-offset-4 hover:underline`

**Sizes**:
- `default`: h-11 px-6 py-2
- `sm`: h-9 rounded-md px-4
- `lg`: h-12 rounded-md px-8 text-base
- `xl`: h-14 rounded-lg px-10 text-lg
- `icon`: h-10 w-10

### Scrollbar
Custom Webkit scrollbar styled to match the theme:
- **Track**: `--background`
- **Thumb**: `--border` (radius 4px), turns to `--golden-deep` on hover.

---

## 5. Animations

Keyframe animations defined in `globals.css`:
- **`loading`**: Simulates a loading bar moving from left to right.
- **`animateIn`**: Fades in from opacity 0 to 1.
- **`slideInFromTop`**: Slides in from `translateY(-10px)` and fades in.

Utility Classes:
- `.animate-in`: `animation: animateIn 0.2s ease-out;`
- `.slide-in-from-top`: `animation: slideInFromTop 0.2s ease-out;`
