import App from "./App.svelte";
import { APP_VERSION } from "./app-version.js";

function reloadWithCacheBust() {
  const url = new URL(window.location.href);
  url.searchParams.set("_cb", Date.now().toString());
  window.location.replace(url.toString());
}

fetch("/version.json?t=" + Date.now(), { cache: "no-store" })
  .then(function (response) {
    return response.json();
  })
  .then(function (data) {
    if (data.version !== APP_VERSION) {
      reloadWithCacheBust();
    }
  })
  .catch(function () {});

const app = new App({
  target: document.body,
  hydrate: true
});

export default app;
