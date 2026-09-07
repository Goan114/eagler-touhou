import json
import socket
import subprocess
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright


PROJECT = Path(__file__).resolve().parents[2]


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def wait_for_server(url: str, process: subprocess.Popen[str]) -> None:
    deadline = time.monotonic() + 30
    last_error = None
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"development server exited early with code {process.returncode}")
        try:
            with urllib.request.urlopen(url, timeout=1) as response:
                if response.status == 200:
                    return
        except Exception as error:  # startup readiness only
            last_error = error
        time.sleep(0.1)
    raise RuntimeError(f"development server did not become ready: {last_error}")


SEED_LOCAL_OGG = """
async () => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('eagler-touhou-package-store-v1', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of ['objects', 'generations', 'installations']) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['objects', 'generations', 'installations'], 'readwrite');
      for (const game of ['th06', 'th07', 'th08']) {
        const musicMount = game === 'th06' ? '/bgm' : '/bgm-ogg';
        const objectIds = {
          data: `obj-local-${game}-data-0001`,
          ogg1: `obj-local-${game}-ogg-0001`,
          ogg2: `obj-local-${game}-ogg-0002`,
        };
        const objects = tx.objectStore('objects');
        objects.put({ data: new Uint8Array([1]).buffer, type: 'application/octet-stream', bytes: 1 }, objectIds.data);
        objects.put({ data: new Uint8Array([2]).buffer, type: 'audio/ogg', bytes: 1 }, objectIds.ogg1);
        objects.put({ data: new Uint8Array([3]).buffer, type: 'audio/ogg', bytes: 1 }, objectIds.ogg2);
        const generation = {
          id: `${game}-music-regression-generation`,
          game,
          descriptor: {
            schema: 'eagler-touhou/package/1',
            game,
            revision: `${game}-local-music-regression`,
            runtimeRequirement: {
              protocol: 'eagler-touhou/runtime-release/1',
              target: game,
              dataFile: 'game-data',
            },
            base: { files: ['game-data'] },
            components: { ogg: { type: 'ogg', files: ['ogg-1', 'ogg-2'] } },
            files: {
              'game-data': {
                source: `data/${game}.data`, target: `/${game}.data`, revision: 'data-r1', bytes: 1,
              },
              'ogg-1': {
                source: `ogg/${game}_01.ogg`, target: `${musicMount}/${game}_01.ogg`, revision: 'ogg-r1', bytes: 1,
              },
              'ogg-2': {
                source: `ogg/${game}_02.ogg`, target: `${musicMount}/${game}_02.ogg`, revision: 'ogg-r1', bytes: 1,
              },
            },
          },
          files: {
            'game-data': { objectId: objectIds.data, revision: 'data-r1', storageMode: 'arraybuffer' },
            'ogg-1': { objectId: objectIds.ogg1, revision: 'ogg-r1', storageMode: 'arraybuffer' },
            'ogg-2': { objectId: objectIds.ogg2, revision: 'ogg-r1', storageMode: 'arraybuffer' },
          },
        };
        tx.objectStore('generations').put(generation, [game, generation.id]);
        tx.objectStore('installations').put({
          game,
          source: 'local',
          currentGeneration: generation.id,
          pendingGeneration: null,
        }, game);
      }
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
"""


def main() -> int:
    port = free_port()
    origin = f"http://127.0.0.1:{port}"
    process = subprocess.Popen(
        ["node", "scripts/serve.mjs", str(port)],
        cwd=PROJECT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        wait_for_server(f"{origin}/", process)
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            context = browser.new_context(service_workers="block")
            page = context.new_page()
            page_errors = []
            console_errors = []
            page.on("pageerror", lambda error: page_errors.append(str(error)))
            page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)

            def strip_published_ogg(route):
                response = route.fetch()
                manifest = response.json()
                for game in manifest.get("games", {}).values():
                    music = game.get("music") or {}
                    music.pop("ogg", None)
                    music.pop("wav", None)
                headers = {
                    key: value for key, value in response.headers.items()
                    if key.lower() not in {"content-length", "content-encoding"}
                }
                headers["content-type"] = "application/json; charset=utf-8"
                route.fulfill(
                    status=response.status,
                    headers=headers,
                    body=json.dumps(manifest),
                )

            page.route("**/host-manifest.json", strip_published_ogg)
            page.goto(f"{origin}/", wait_until="load", timeout=30_000)
            try:
                page.wait_for_function("() => window.__eaglerBoot?.done === true", timeout=30_000)
            except Exception as error:
                diagnostic = page.evaluate("""() => ({
                  boot: window.__eaglerBoot || null,
                  readyState: document.readyState,
                  body: (document.body?.innerText || '').slice(0, 1800),
                  appScript: document.querySelector('script[type="module"]')?.src || '',
                })""")
                server_stdout = ""
                server_stderr = ""
                if process.poll() is not None:
                    server_stdout = process.stdout.read() if process.stdout else ""
                    server_stderr = process.stderr.read() if process.stderr else ""
                raise AssertionError(json.dumps({
                    "diagnostic": diagnostic,
                    "pageErrors": page_errors,
                    "consoleErrors": console_errors,
                    "serverStdout": server_stdout,
                    "serverStderr": server_stderr,
                }, ensure_ascii=False)) from error
            page.evaluate(SEED_LOCAL_OGG)
            page.reload(wait_until="load")
            try:
                page.wait_for_function("() => window.__eaglerBoot?.done === true", timeout=30_000)
            except Exception as error:
                diagnostic = page.evaluate("""() => ({
                  boot: window.__eaglerBoot || null,
                  readyState: document.readyState,
                  body: (document.body?.innerText || '').slice(0, 1800),
                })""")
                raise AssertionError(json.dumps({
                    "phase": "reload-after-package-seed",
                    "diagnostic": diagnostic,
                    "pageErrors": page_errors,
                    "consoleErrors": console_errors,
                }, ensure_ascii=False)) from error
            page.evaluate("document.querySelector('#changelogDialog')?.close()")

            results = {}

            def exercise(card_selector: str, select_id: str, desired: str, require_single_music_panel: bool = False):
                page.locator(card_selector).click()
                if require_single_music_panel:
                    page.wait_for_function("() => !document.getElementById('musicOption').hidden")
                result = page.evaluate("""([selectId, desired]) => {
                  const select = document.getElementById(selectId);
                  const enabled = Object.fromEntries([...select.options].map(option => [option.value, !option.disabled]));
                  select.value = desired;
                  select.dispatchEvent(new Event('change', { bubbles: true }));
                  return { enabled, value: select.value };
                }""", [select_id, desired])
                page.wait_for_timeout(50)
                result["valueAfterRender"] = page.locator(f"#{select_id}").input_value()
                return result

            for game in ("th06", "th07", "th08"):
                results[game] = exercise(
                    f'.game-{game}:not(.game-multiplayer)', "musicSelect", "ogg-full", True
                )
            for product in ("th06mp", "th07mp"):
                results[product] = exercise(f'[data-product="{product}"]', "mpMusicSelect", "ogg-stream")

            for result in results.values():
                if not result["enabled"].get("ogg-stream") or not result["enabled"].get("ogg-full"):
                    raise AssertionError(f"local OGG options are disabled: {result}")
                if not result["valueAfterRender"].startswith("ogg-"):
                    raise AssertionError(f"render reverted explicit local OGG selection: {result}")

            print(json.dumps({
                "musicSelectionBrowser": "PASS",
                "hostPublishesOgg": False,
                "products": results,
            }, ensure_ascii=False))
            browser.close()
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
