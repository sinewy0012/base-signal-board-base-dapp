import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";

const root = resolve(new URL("..", import.meta.url).pathname);
const outDir = join(root, "base-submission");

const W = 1284;
const H = 2778;

const colors = {
  bg: "#0A0D12",
  panel: "#12171E",
  line: "#344153",
  silver: "#B6C2D0",
  silver2: "#8D99A8",
  white: "#E8EEF7",
  soft: "#8FA6C0",
  up: "#49F07A",
  down: "#FF715A",
  hold: "#FFD64A",
};

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrap(text, maxChars) {
  const words = text.split(" ");
  const result = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      result.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) result.push(current);
  return result;
}

function frame(content) {
  return `
  <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${colors.silver}"/>
        <stop offset="100%" stop-color="${colors.silver2}"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="${colors.bg}"/>
    ${content}
  </svg>`;
}

function header(title, subtitle) {
  const lines = wrap(subtitle, 35);
  return `
    <rect x="54" y="54" width="1176" height="248" rx="34" fill="url(#metal)" stroke="${colors.line}" stroke-width="4"/>
    <rect x="70" y="70" width="1144" height="216" rx="26" fill="#0F131A"/>
    <text x="94" y="116" font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="${colors.soft}">BASE SIGNAL BOARD</text>
    <text x="94" y="196" font-family="Arial, sans-serif" font-size="72" font-weight="900" fill="${colors.white}">${esc(title)}</text>
    ${lines.map((line, index) => `<text x="98" y="${244 + index * 34}" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="${colors.soft}">${esc(line)}</text>`).join("")}
  `;
}

function card(x, y, width, height, title, lines, accent = colors.soft, bg = colors.panel) {
  const wrapped = lines.flatMap((line, index) => (index === 0 ? [line] : wrap(line, Math.floor((width - 54) / 12))));
  return `
    <g>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="26" fill="${bg}" stroke="${colors.line}" stroke-width="4"/>
      <text x="${x + 24}" y="${y + 46}" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="${accent}">${esc(title)}</text>
      ${wrapped.map((line, index) => `<text x="${x + 24}" y="${y + 102 + index * 34}" font-family="Arial, sans-serif" font-size="${index === 0 ? 32 : 26}" font-weight="${index === 0 ? 900 : 700}" fill="${index === 0 ? colors.white : colors.soft}">${esc(line)}</text>`).join("")}
    </g>
  `;
}

function flipBoard(x, y, title, direction, intensity, tone) {
  const rows = [title.padEnd(18, " ").slice(0, 18), direction.padEnd(8, " ").slice(0, 8), `INT ${String(intensity).padStart(3, "0")}`];
  return `
    <g>
      <rect x="${x}" y="${y}" width="1140" height="560" rx="30" fill="#171D25" stroke="${colors.line}" stroke-width="4"/>
      ${rows.map((row, rowIndex) =>
        row
          .split("")
          .map((char, charIndex) => {
            const fill = char === " " ? "#11151B" : rowIndex === 1 ? tone : colors.white;
            return `
            <rect x="${x + 36 + charIndex * 56}" y="${y + 54 + rowIndex * 146}" width="46" height="74" rx="6" fill="#11151B" stroke="#4A5568" stroke-width="2"/>
            <text x="${x + 59 + charIndex * 56}" y="${y + 104 + rowIndex * 146}" text-anchor="middle" font-family="Courier New, monospace" font-size="34" font-weight="900" fill="${fill}">
              ${char === " " ? "_" : esc(char)}
            </text>`;
          })
          .join(""),
      ).join("")}
    </g>
  `;
}

function screenshot1() {
  const content = `
    ${header("Broadcast directional conviction.", "Write a signal title, pick up, down, or hold, and publish the read on Base.")}
    ${card(72, 356, 548, 220, "Signal setup", ["ETH BETA BREATHING", "Direction: UP", "Intensity: 72"], colors.up)}
    ${card(664, 356, 548, 220, "Why it works", ["Fast directional post", "Readable at a glance"], colors.hold)}
    ${flipBoard(72, 620, "ETH BETA BREATHING", "UP", 72, colors.up)}
    ${card(72, 1236, 548, 228, "Context", ["Momentum is back but still uneven, so the board reads bullish with caution."], colors.soft)}
    ${card(664, 1236, 548, 228, "Controls", ["Direction / intensity / note"], colors.soft)}
    ${card(72, 1508, 1140, 220, "Action", ["Broadcast signal", "Wallet-confirmed board entry on Base"], colors.white, "#11151B")}
    <rect x="72" y="2524" width="1140" height="116" rx="24" fill="${colors.white}" stroke="${colors.line}" stroke-width="4"/>
    <text x="642" y="2597" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="#0D1117">BROADCAST SIGNAL</text>
  `;
  return frame(content);
}

function screenshot2() {
  const content = `
    ${header("A signal board, not a plain feed.", "The flip display makes direction and strength readable before anyone opens the full note.")}
    ${flipBoard(72, 356, "ETH BETA BREATHING", "UP", 72, colors.up)}
    ${card(72, 966, 548, 236, "Signal A", ["UP", "Intensity 72", "May 14, 2026"], colors.up)}
    ${card(664, 966, 548, 236, "Signal B", ["HOLD", "Intensity 48", "May 13, 2026"], colors.hold)}
    ${card(72, 1248, 1140, 244, "Board note", ["The whole point is quick directional clarity: title first, bias second, context third."], colors.soft)}
    ${card(72, 1542, 1140, 240, "Archive use", ["Keep a timestamped chain of calls instead of dumping opinions into a chat thread."], colors.soft)}
  `;
  return frame(content);
}

function screenshot3() {
  const content = `
    ${header("Look up any prior signal.", "Open a stored board call by ID and inspect the bias, intensity, context, author, and date.")}
    ${card(72, 356, 1140, 228, "Lookup result", ["ETH BETA BREATHING", "UP", "Intensity 72"], colors.up)}
    ${flipBoard(72, 628, "ETH BETA BREATHING", "UP", 72, colors.up)}
    ${card(72, 1238, 548, 236, "Author", ["0x9936...9652", "Published on Base"], colors.soft)}
    ${card(664, 1238, 548, 236, "Date", ["May 14, 2026", "Direction locked onchain"], colors.soft)}
    ${card(72, 1522, 1140, 272, "Explanation", ["Momentum is back but still uneven, so the board reads bullish with caution, not blind euphoria."], colors.white, "#11151B")}
    <rect x="72" y="2524" width="1140" height="116" rx="24" fill="${colors.up}" stroke="${colors.line}" stroke-width="4"/>
    <text x="642" y="2597" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="#081012">LOAD NEXT SIGNAL</text>
  `;
  return frame(content);
}

function iconSvg() {
  return `
  <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <rect width="1024" height="1024" fill="${colors.bg}"/>
    <rect x="148" y="148" width="728" height="728" rx="74" fill="url(#metal)" stroke="${colors.line}" stroke-width="20"/>
    <rect x="188" y="188" width="648" height="648" rx="56" fill="#10151C"/>
    ${["E","T","H","U","P","7","2"].map((char, index) => `
      <rect x="${226 + (index % 4) * 138}" y="${250 + Math.floor(index / 4) * 180}" width="106" height="126" rx="12" fill="#11151B" stroke="#4A5568" stroke-width="8"/>
      <text x="${279 + (index % 4) * 138}" y="${332 + Math.floor(index / 4) * 180}" text-anchor="middle" font-family="Courier New, monospace" font-size="58" font-weight="900" fill="${index < 3 ? colors.white : index < 5 ? colors.up : colors.white}">${char}</text>
    `).join("")}
  </svg>`;
}

function thumbnailSvg() {
  return `
  <svg width="1910" height="1000" viewBox="0 0 1910 1000" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${colors.silver}"/>
        <stop offset="100%" stop-color="${colors.silver2}"/>
      </linearGradient>
    </defs>
    <rect width="1910" height="1000" fill="${colors.bg}"/>
    <rect x="72" y="72" width="1766" height="220" rx="34" fill="url(#metal)" stroke="${colors.line}" stroke-width="6"/>
    <rect x="92" y="92" width="1726" height="180" rx="24" fill="#0F131A"/>
    <text x="120" y="174" font-family="Arial, sans-serif" font-size="118" font-weight="900" fill="${colors.white}">Base Signal Board</text>
    <text x="124" y="242" font-family="Arial, sans-serif" font-size="42" font-weight="800" fill="${colors.soft}">Directional calls with title, strength, and context, published on Base.</text>
    ${flipBoard(96, 344, "ETH BETA BREATHING", "UP", 72, colors.up)}
    ${card(1328, 344, 480, 220, "Signal", ["UP", "Intensity 72"], colors.up)}
    ${card(1328, 604, 480, 244, "Why", ["Readable like a terminal board, not buried like a text post."], colors.soft)}
  </svg>`;
}

async function writePng(name, svg, width = W, height = H) {
  const file = join(outDir, name);
  await sharp(Buffer.from(svg))
    .resize(width, height)
    .png({ quality: 92, compressionLevel: 9 })
    .toFile(file);
  return file;
}

async function writeJpg(name, svg, width, height) {
  const file = join(outDir, name);
  await sharp(Buffer.from(svg))
    .resize(width, height)
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(file);
  return file;
}

await mkdir(outDir, { recursive: true });

const files = [
  await writeJpg("app-icon.jpg", iconSvg(), 1024, 1024),
  await writeJpg("app-thumbnail.jpg", thumbnailSvg(), 1910, 1000),
  await writePng("screenshot-1.png", screenshot1()),
  await writePng("screenshot-2.png", screenshot2()),
  await writePng("screenshot-3.png", screenshot3()),
];

const manifest = {
  generatedAt: new Date().toISOString(),
  files,
};

await writeFile(join(outDir, "asset-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

for (const file of files) {
  console.log(file);
}
