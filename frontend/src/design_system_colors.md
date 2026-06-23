# Zen Design System - Background Color Palette

This document outlines the core background color tones used for the Saloon & Spa CRM "Zen" interface.

## 🎨 Primary Tones

| Element | CSS Variable | Hex Code | Visual Sample | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Page Background** | `--zen-cream` | `#F8FAFC` | ⚪ | The global background applied to the `body`. Soft off-white to reduce eye strain. |
| **Container / Card** | `white` | `#FFFFFF` | ⚪ | Primary background for cards and interactive surfaces to provide high contrast. |
| **Dark Surface** | `--zen-brown` | `#1E1B4B` | ⚫ | Deep navy used for specialized containers like the "Administrative Tools" card. |
| **Secondary Surface**| `--zen-stone` | `#F1F5F9` | 🔘 | Subtle grey used for borders, secondary sections, and light hover states. |

## ✨ Glassmorphism Tones

These are used for modern, semi-transparent overlays with backdrop blurring (`backdrop-blur-md`).

*   **Standard Glass**: `bg-white/60` (White at 60% opacity)
*   **Dark Glass**: `bg-zen-brown/10` (#1E1B4B at 10% opacity)
*   **Lavender Glass**: `bg-zen-sand/10` (#7C3AED at 10% opacity)

## 🛠 Usage Examples

### Page Layout
```css
body {
  background-color: var(--zen-cream); /* #F8FAFC */
}
```

### Standard Card
```css
.card {
  background-color: #FFFFFF;
  border: 1px solid var(--zen-stone); /* #F1F5F9 */
  border-radius: 1.5rem;
  box-shadow: var(--shadow-sm);
}
```

### Dark Administrative Container
```css
.admin-card {
  background-color: var(--zen-brown); /* #1E1B4B */
  color: white;
  border-radius: 1.5rem;
}
```
