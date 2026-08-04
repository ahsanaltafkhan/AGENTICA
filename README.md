
# Agentica — The AI Operating System

A premium, standalone marketing website and interactive AI Operating System dashboard. Built with only **HTML5, CSS3, and vanilla JavaScript** — no frameworks, no build step, no external assets.

---

## What it is

Agentica is a spatial, glass-morphism interface for a fictional AI infrastructure platform. It demonstrates:

- **Liquid Glass / Spatial UI** design language
- A living, breathing **AI Core** rendered with pure CSS and JavaScript
- A fully interactive **multi-panel dashboard** (Chat, Voice, Vision, Files, Memory, Logs, Timeline, API, Webhooks, Analytics, Settings)
- A working **Command Palette** (`⌘K`)
- Scroll reveals, pointer-reactive lighting, 3D tilt, and particle effects
- Responsive layout from mobile to desktop

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | Semantic structure, sections, and dashboard markup |
| `style.css`  | Complete design system, glass materials, animations, responsive layout |
| `script.js`  | Runtime: motion loop, pointer field, command palette, chat, voice, files, analytics, settings |

---

## How to run

No server or build step is required.

1. Unzip `agentica.zip` (or keep the three files together in one folder).
2. Open `index.html` in any modern browser.

Or serve locally for testing:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

---

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘ / Ctrl + K` | Open Command Palette |
| `Esc` | Close Command Palette / modals |
| `↑ / ↓` | Navigate palette results |
| `Enter` | Activate selected palette item |

---

## Browser support

- Chrome / Edge / Firefox / Safari (latest)
- Requires CSS `backdrop-filter` support for the full glass effect
- Respects `prefers-reduced-motion`

---

## Design notes

- **Zero dependencies** — every icon is inline SVG, every animation is CSS/JS, every gradient is hand-coded.
- **Performance-first** — one shared `requestAnimationFrame` loop drives all continuous motion.
- **Accessibility** — semantic HTML, ARIA labels, keyboard-navigable palette, reduced-motion support.

---

## License

This is a demonstration / portfolio piece. You are free to adapt and reuse it for your own projects.
=======
# AGENTICA
This is a Web Application designed for AI agents and Services DEMOS
>>>>>>> 20ceb7522e0263d755ad389b5e60b65461029d4b
