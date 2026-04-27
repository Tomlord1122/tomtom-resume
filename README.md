# Resume

Edit `resume.md`, then render tagged HTML and PDF locally.

## Commands

- `npm install` installs the local toolchain.
- `npm run build` renders `dist/resume.html` and `dist/resume.pdf`.
- `npm run build:html` renders only tagged HTML.
- `npm run build:pdf` renders only PDF.
- `npm run dev` watches `resume.md` and `styles/resume.css`, then rebuilds HTML after edits.
- `npm run validate` checks that `resume.md` has the expected top-level heading and section headings.

## Editing

Use the provided structure in `resume.md`:

- `#` for your name.
- `##` for resume sections.
- `###` for roles, projects, schools, or certificates.
- Bullet lists for achievements.

The renderer converts Markdown into semantic, tagged HTML using `<header>`, `<main>`, `<section>`, headings, lists, dates, and contact links. The PDF is generated from the same HTML with print CSS.

## Research Notes

I looked at these options before choosing this setup:

- JSON Resume / `resumed`: modern and schema-based, good if you want structured JSON and themes. It does not use Markdown as the primary editing format.
- `resume-cli`: original JSON Resume CLI, but its README says it is not actively maintained and recommends third-party clients like `resumed`.
- `pandoc_resume`: Markdown-first, but PDF output expects Pandoc plus ConTeXt or a LaTeX setup.
- Pandoc directly: powerful Markdown conversion, but PDF generation needs an extra PDF engine.
- WeasyPrint: strong HTML-to-PDF option, but adds a Python/system dependency.

This repo uses Markdown plus a small local Node renderer because it keeps editing simple, produces accessible HTML tags directly, and avoids a heavy system dependency.
