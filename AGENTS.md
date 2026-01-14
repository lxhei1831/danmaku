# Repository Guidelines

## Project Structure & Module Organization
- `index.html` is the entry page and wires up the player UI.
- `css/main.css` holds all styling; sections are grouped with header comments.
- `js/main.js` contains the danmaku logic, AI chat flows, heatmap, and video helpers.
- `assets/data` stores XML danmaku sources and `caption.srt` used for subtitles/AI context.
- `assets/images` for icons; `assets/videos` for demo media.

## Build, Test, and Development Commands
- `python -m http.server 8000` — run a local static server so `fetch()` can load XML/SRT; open `http://localhost:8000/`.
- No build step or package manager; edit files directly and refresh the browser.

## Coding Style & Naming Conventions
- HTML uses 2-space indentation; keep the DOM structure aligned with `index.html`.
- CSS/JS formatting follows the existing compact style in `css/main.css` and `js/main.js` (group related declarations, keep section headers).
- Use `camelCase` for JS variables/functions, `UPPER_SNAKE_CASE` for constants, and `kebab-case` for CSS classes/IDs.

## Testing Guidelines
- No automated test framework in this repo.
- Manual checks: load the page, play a video, send a danmaku, open sidebars, and watch console for errors.

## Commit & Pull Request Guidelines
- Recent commits are short descriptive phrases (often in Chinese) without prefixes; keep messages concise and task-focused.
- PRs should include: a brief summary, testing notes (commands or manual steps), and screenshots or a short recording for UI changes.

## Security & Configuration
- `SILICONFLOW_API_KEY` is defined in `js/main.js`; use a local key for development and avoid committing real secrets.
