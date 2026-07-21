const fs = require("fs");
const path = require("path");

const indexPath = path.join(__dirname, "../public/index.html");
const buildVersion = Date.now();

let html = fs.readFileSync(indexPath, "utf8");

const cacheMeta = [
  '<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />',
  '<meta http-equiv="Pragma" content="no-cache" />',
  '<meta http-equiv="Expires" content="0" />',
].join("\n    ");

if (!html.includes('http-equiv="Cache-Control"')) {
  html = html.replace(
    /<meta name="viewport"[^>]*\/>/,
    `$&\n\n    ${cacheMeta}`
  );
}

const assets = ["global.css", "main.css", "build/bundle.css", "build/bundle.js"];

for (const asset of assets) {
  const pattern = new RegExp(`(/${asset.replace("/", "\\/")})(\\?v=[^"'\\s>]*)?`, "g");
  html = html.replace(pattern, `$1?v=${buildVersion}`);
}

fs.writeFileSync(indexPath, html);
console.log(`Cache bust applied: v=${buildVersion}`);
