const fs = require("fs");
const path = require("path");

const indexPath = path.join(__dirname, "../public/index.html");
const versionPath = path.join(__dirname, "../public/version.json");
const appVersionPath = path.join(__dirname, "../src/app-version.js");
const buildVersion = Date.now();

const appVersionFile = fs.readFileSync(appVersionPath, "utf8");
const versionMatch = appVersionFile.match(/APP_VERSION = "([^"]+)"/);
const appVersion = versionMatch ? versionMatch[1] : "0.0.0";

fs.writeFileSync(
  versionPath,
  JSON.stringify({ version: appVersion, build: String(buildVersion) }, null, 2)
);

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

const reloadScript = `<script>
      (function () {
        var CURRENT_BUILD = "${buildVersion}";
        var CURRENT_VERSION = "${appVersion}";

        function reloadWithCacheBust() {
          var url = new URL(window.location.href);
          url.searchParams.set("_cb", Date.now().toString());
          window.location.replace(url.toString());
        }

        window.addEventListener("pageshow", function (event) {
          if (event.persisted) {
            reloadWithCacheBust();
          }
        });

        if (!new URL(window.location.href).searchParams.get("_cb")) {
          reloadWithCacheBust();
          return;
        }

        fetch("/version.json?t=" + Date.now(), { cache: "no-store" })
          .then(function (response) {
            return response.json();
          })
          .then(function (data) {
            if (
              data.version !== CURRENT_VERSION ||
              String(data.build) !== CURRENT_BUILD
            ) {
              reloadWithCacheBust();
            }
          })
          .catch(function () {});
      })();
    </script>`;

const reloadScriptPattern =
  /<script>\s*\(function \(\) \{\s*var CURRENT_BUILD[\s\S]*?\}\)\(\);\s*<\/script>/;

if (reloadScriptPattern.test(html)) {
  html = html.replace(reloadScriptPattern, "");
}

html = html.replace(
  /<meta http-equiv="Expires" content="0" \/>/,
  `$&\n\n    ${reloadScript}`
);

const assets = ["global.css", "main.css", "build/bundle.css", "build/bundle.js"];

for (const asset of assets) {
  const pattern = new RegExp(`(/${asset.replace("/", "\\/")})(\\?v=[^"'\\s>]*)?`, "g");
  html = html.replace(pattern, `$1?v=${buildVersion}`);
}

fs.writeFileSync(indexPath, html);
console.log(`Cache bust applied: v=${appVersion} (${buildVersion})`);
