import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import MarkdownIt from "markdown-it";
import puppeteer from "puppeteer";

const root = process.cwd();
const sourcePath = path.join(root, "resume.md");
const stylesPath = path.join(root, "styles", "resume.css");
const htmlPath = path.join(root, "resume.html");
const pdfPath = path.join(root, "resume.pdf");

const command = process.argv[2] ?? "html";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true
});

function validate(markdown) {
  const errors = [];

  if (!/^#\s+\S+/m.test(markdown)) {
    errors.push("resume.md must start with a level-one heading for your name.");
  }

  const sections = markdown.match(/^##\s+\S+.*$/gm) ?? [];
  if (sections.length === 0) {
    errors.push("resume.md must include at least one level-two section heading.");
  }

  return errors;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function splitSections(tokens) {
  const firstH2 = tokens.findIndex(
    (token) => token.type === "heading_open" && token.tag === "h2"
  );

  const headerTokens = firstH2 === -1 ? tokens : tokens.slice(0, firstH2);
  const bodyTokens = firstH2 === -1 ? [] : tokens.slice(firstH2);
  const sections = [];

  for (let index = 0; index < bodyTokens.length; ) {
    const token = bodyTokens[index];

    if (token.type !== "heading_open" || token.tag !== "h2") {
      index += 1;
      continue;
    }

    const next = bodyTokens.findIndex(
      (candidate, offset) =>
        offset > index && candidate.type === "heading_open" && candidate.tag === "h2"
    );
    const end = next === -1 ? bodyTokens.length : next;

    sections.push(bodyTokens.slice(index, end));
    index = end;
  }

  return { headerTokens, sections };
}

function renderSection(tokens) {
  markDateParagraphs(tokens);

  const headingClose = tokens.findIndex((token) => token.type === "heading_close");
  const headingTokens = tokens.slice(0, headingClose + 1);
  const contentTokens = tokens.slice(headingClose + 1);

  return `<section class="resume-section" aria-labelledby="${sectionId(headingTokens)}">
${md.renderer.render(headingTokens, md.options, {})}
<div class="section-body">
${md.renderer.render(contentTokens, md.options, {})}
</div>
</section>`;
}

function markDateParagraphs(tokens) {
  for (let index = 0; index < tokens.length - 2; index += 1) {
    const previous = tokens[index - 1];
    const token = tokens[index];
    const inline = tokens[index + 1];

    if (
      previous?.type !== "heading_close" ||
      previous.tag !== "h3" ||
      token.type !== "paragraph_open" ||
      inline?.type !== "inline"
    ) {
      continue;
    }

    if (/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{4}\b/.test(inline.content)) {
      token.attrJoin("class", "resume-date");
    }
  }
}

function sectionId(headingTokens) {
  const inline = headingTokens.find((token) => token.type === "inline");
  const text = inline?.content ?? "section";
  return `section-${text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function addHeadingIds(tokens) {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== "heading_open") continue;

    const inline = tokens[index + 1];
    if (!inline || inline.type !== "inline") continue;

    const id = token.tag === "h2" ? sectionId([token, inline]) : null;
    if (id) token.attrSet("id", id);
  }
}

async function renderHtml() {
  const [markdown, css] = await Promise.all([
    fs.readFile(sourcePath, "utf8"),
    fs.readFile(stylesPath, "utf8")
  ]);
  const errors = validate(markdown);

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  const env = {};
  const tokens = md.parse(markdown, env);
  addHeadingIds(tokens);
  const { headerTokens, sections } = splitSections(tokens);
  const title = tokens.find((token) => token.type === "inline")?.content ?? "Resume";
  const body = `<article class="resume">
<header class="resume-header">
${md.renderer.render(headerTokens, md.options, env)}
</header>
<main>
${sections.map(renderSection).join("\n")}
</main>
</article>`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>${css}</style>
</head>
<body>
${body}
</body>
</html>
`;

  await fs.writeFile(htmlPath, html);
}

async function renderPdf() {
  await renderHtml();

  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0" });
    await page.pdf({
      path: pdfPath,
      format: "letter",
      printBackground: true,
      preferCSSPageSize: true
    });
  } finally {
    await browser.close();
  }
}

const markdown = await fs.readFile(sourcePath, "utf8");
const errors = validate(markdown);

if (command === "validate") {
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
  console.log("resume.md is valid.");
} else if (command === "html") {
  await renderHtml();
  console.log(`Rendered ${path.relative(root, htmlPath)}.`);
} else if (command === "pdf") {
  await renderPdf();
  console.log(`Rendered ${path.relative(root, pdfPath)}.`);
} else {
  throw new Error(`Unknown command: ${command}`);
}
