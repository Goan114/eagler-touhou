import hashlib
import os
import sys
import time
from collections import Counter

from playwright.sync_api import sync_playwright


URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8168/eagler-touhou/"
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ARTIFACT_DIR = os.path.join(ROOT, "artifacts", "th08-save-e2e")
FIXTURE_PATH = (
    os.path.abspath(sys.argv[2])
    if len(sys.argv) > 2
    else os.path.join(ARTIFACT_DIR, "public-save-fixture", "th08", "score.dat")
)
BROWSER_ENGINE = sys.argv[3].lower() if len(sys.argv) > 3 else "chromium"
if BROWSER_ENGINE not in {"chromium", "webkit"}:
    raise SystemExit("browser engine must be chromium or webkit")
os.makedirs(ARTIFACT_DIR, exist_ok=True)


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def prepare_launcher(page, suffix):
    page.goto(f"{URL}?th08-save-e2e={suffix}-{int(time.time())}", wait_until="load", timeout=30000)
    page.wait_for_function(
        "window.__eaglerBoot?.done === true && !!document.querySelector(\"[data-game='th08']\")",
        timeout=30000,
    )
    page.evaluate(
        """
        () => {
          localStorage.setItem('eagler-touhou-changelog-seen-20260822-1', '1');
          document.querySelector('#changelogDialog')?.close();
          const preferenceKey = 'eagler-touhou-game-options-v1-th08';
          let saved = {};
          try { saved = JSON.parse(localStorage.getItem(preferenceKey) || '{}') || {}; } catch {}
          localStorage.setItem(preferenceKey, JSON.stringify({
            ...saved,
            music: 'none',
            musicPreferenceExplicit: true,
            options: saved.options || {},
          }));
          window.__th08SaveFirstFrame = false;
          window.addEventListener('message', event => {
            const message = event.data || {};
            if (message.protocol === 'eagler-touhou/1' && message.game === 'th08' && message.event === 'first-frame') {
              window.__th08SaveFirstFrame = true;
            }
          });
          document.querySelector("[data-game='th08']")?.click();
          const music = document.getElementById('musicSelect');
          music.value = 'none';
        }
        """
    )


def idb_save_state(page):
    return page.evaluate(
        """
        async () => {
          const databaseName = '/savesth08';
          const result = { databaseName, databases: [], entries: [] };
          if (typeof indexedDB.databases === 'function') {
            result.databases = (await indexedDB.databases()).map(item => item.name).filter(Boolean);
          }
          const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open(databaseName);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          try {
            if (!db.objectStoreNames.contains('FILE_DATA')) return result;
            result.entries = await new Promise((resolve, reject) => {
              const transaction = db.transaction(['FILE_DATA'], 'readonly');
              const store = transaction.objectStore('FILE_DATA');
              const output = [];
              const request = store.openCursor();
              request.onsuccess = event => {
                const cursor = event.target.result;
                if (!cursor) { resolve(output); return; }
                const value = cursor.value || {};
                output.push({
                  key: String(cursor.key),
                  mode: value.mode ?? null,
                  timestamp: value.timestamp instanceof Date ? value.timestamp.toISOString() : String(value.timestamp ?? ''),
                  bytes: value.contents?.byteLength ?? value.contents?.length ?? null,
                });
                cursor.continue();
              };
              request.onerror = () => reject(request.error);
            });
          } finally {
            db.close();
          }
          return result;
        }
        """
    )


def launch_and_wait(page):
    page.evaluate("document.getElementById('launch')?.click()")
    deadline = time.time() + 180
    while time.time() < deadline:
        try:
            if page.locator("#decisionDialog").evaluate("dialog => dialog.open"):
                page.locator("#decisionConfirm").click()
        except Exception:
            pass
        state = page.evaluate(
            """
            () => ({
              firstFrame: window.__th08SaveFirstFrame === true,
              playerStatus: document.getElementById('playerStatus')?.textContent || '',
              hostStatus: document.getElementById('status')?.textContent || '',
              frameSrc: document.getElementById('gameFrame')?.src || '',
              playerOpen: document.getElementById('player')?.classList.contains('open') || false,
            })
            """
        )
        if (
            state["firstFrame"]
            and state["playerStatus"] == "运行中"
            and "/runtime/th08/th08-modern.html" in state["frameSrc"]
            and "managedData=1" in state["frameSrc"]
        ):
            return state
        combined = "\n".join([state["playerStatus"], state["hostStatus"]])
        if any(token.lower() in combined.lower() for token in ["referenceerror", "typeerror", "失败", "错误", "超时"]):
            raise RuntimeError(f"TH08 launch failed: {state}")
        time.sleep(0.25)
    raise TimeoutError(f"TH08 launch timed out: {state}")


def runtime_command(page, command, payload=None):
    return page.evaluate(
        """
        async ({ command, payload }) => {
          const frame = document.getElementById('gameFrame');
          if (!frame?.contentWindow) throw new Error('TH08 Runtime frame is unavailable');
          const request = `th08-save-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          return await new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
              window.removeEventListener('message', onMessage);
              reject(new Error(`${command} timed out`));
            }, 10000);
            const onMessage = event => {
              const message = event.data || {};
              if (event.source !== frame.contentWindow || message.protocol !== 'eagler-touhou/1' ||
                  message.game !== 'th08' || message.request !== request) return;
              clearTimeout(timer);
              window.removeEventListener('message', onMessage);
              if (message.ok) resolve(message);
              else reject(new Error(message.error || `${command} failed`));
            };
            window.addEventListener('message', onMessage);
            frame.contentWindow.postMessage({
              protocol: 'eagler-touhou/1', game: 'th08', request, command, ...(payload || {})
            }, location.origin);
          });
        }
        """,
        {"command": command, "payload": payload or {}},
    )


def export_save(page, destination):
    with page.expect_download(timeout=30000) as download_info:
        page.locator("#saveFileTool [data-action='export-save']").evaluate("element => element.click()")
    download = download_info.value
    download.save_as(destination)
    if not os.path.isfile(destination) or os.path.getsize(destination) == 0:
        raise RuntimeError("exported TH08 score.dat is empty")


def import_save(page, source):
    page.locator("#saveFileTool [data-action='import-save']").evaluate("element => element.click()")
    page.wait_for_function("document.getElementById('decisionDialog')?.open === true", timeout=10000)
    with page.expect_file_chooser(timeout=10000) as chooser_info:
        page.locator("#decisionConfirm").click()
    chooser_info.value.set_files(source)
    page.wait_for_function(
        "document.getElementById('status')?.textContent?.includes('已导入 1 个文件')",
        timeout=60000,
    )
    state = page.evaluate(
        """
        () => ({
          status: document.getElementById('status')?.textContent || '',
          playerOpen: document.getElementById('player')?.classList.contains('open') || false,
        })
        """
    )
    if state["playerOpen"]:
        raise RuntimeError(f"save import should return to Launcher: {state}")


def close_player_normally(page):
    # Exercise the same product lifecycle as browser Back without letting the
    # test harness's own document-level page.goto history entries choose which
    # document receives the navigation. app.js owns the popstate handler and
    # routes it through closePlayerView(true) -> sync -> resetRuntime().
    page.evaluate("window.dispatchEvent(new PopStateEvent('popstate'))")
    page.wait_for_function(
        "!document.getElementById('player')?.classList.contains('open') && !document.getElementById('gameFrame')?.hasAttribute('src')",
        timeout=10000,
    )


def main():
    prelaunch_path = os.path.join(ARTIFACT_DIR, "score-after-page-reload-before-launch.dat")
    after_path = os.path.join(ARTIFACT_DIR, "score-after-reload.dat")
    if not os.path.isfile(FIXTURE_PATH):
        raise FileNotFoundError(FIXTURE_PATH)
    fixture_size = os.path.getsize(FIXTURE_PATH)
    fixture_hash = sha256(FIXTURE_PATH)
    console_errors = []
    page_errors = []

    with sync_playwright() as playwright:
        browser_type = getattr(playwright, BROWSER_ENGINE)
        browser = browser_type.launch(headless=True)
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        page.on("pageerror", lambda error: page_errors.append(str(error)))

        prepare_launcher(page, "initial")
        first_state = launch_and_wait(page)
        page.wait_for_timeout(500)
        listing = runtime_command(page, "list")
        if any(item.get("path") == "score.dat" for item in listing.get("files", [])):
            raise RuntimeError(f"clean TH08 browser unexpectedly already has score.dat: {listing}")
        if not any(item.get("path") == "th08.cfg" for item in listing.get("files", [])):
            raise RuntimeError(f"TH08 save root/cwd is not active: {listing}")
        forbidden_save_paths = {"th08.dat", "modern-files.txt", "modern-crash.txt", "modern-render.txt", "modern-enemy-render.csv"}
        leaked = sorted(item.get("path") for item in listing.get("files", []) if item.get("path") in forbidden_save_paths)
        if leaked:
            raise RuntimeError(f"TH08 Runtime-only files leaked into the persistent save root: {leaked}")

        import_save(page, FIXTURE_PATH)

        # Diagnose the direct cold-start path before any temporary Runtime is
        # created by exportFiles().  This distinguishes IndexedDB durability
        # from a Runtime startup mutation.
        prepare_launcher(page, "reload-direct")
        idb_before_direct_launch = idb_save_state(page)
        persisted_entry = next(
            (item for item in idb_before_direct_launch["entries"] if item["key"] == "/savesth08/score.dat"),
            None,
        )
        if not persisted_entry or persisted_entry.get("bytes") != fixture_size:
            raise RuntimeError(
                f"TH08 score.dat is not durable in IndexedDB before direct launch: {idb_before_direct_launch}"
            )
        persisted_keys = {item["key"] for item in idb_before_direct_launch["entries"]}
        forbidden_idb = sorted(
            key for key in persisted_keys
            if key.rsplit("/", 1)[-1] in forbidden_save_paths
        )
        if forbidden_idb:
            raise RuntimeError(f"TH08 Runtime-only files persisted in IDBFS: {forbidden_idb}")
        page.evaluate("window.__th08SaveFirstFrame = false")
        direct_state = launch_and_wait(page)
        page.wait_for_timeout(500)
        direct_listing = runtime_command(page, "list")
        direct_idb_after = idb_save_state(page)
        direct_score = next((item for item in direct_listing.get("files", []) if item.get("path") == "score.dat"), None)
        if not direct_score or direct_score.get("size") != fixture_size:
            raise RuntimeError(
                "TH08 score.dat disappeared during direct cold launch: "
                f"before={idb_before_direct_launch} runtime={direct_listing} after={direct_idb_after} frame={direct_state['frameSrc']}"
            )

        # Follow the same lifecycle used by TH06/TH07 and by normal Launcher
        # navigation: flush the active Runtime before tearing its iframe down.
        # A hard whole-document navigation while TH08's startup backup is
        # still mutating IDBFS is an abnormal interruption case, not the
        # Launcher's save/import/export contract.
        close_player_normally(page)
        idb_after_normal_close = idb_save_state(page)
        closed_score = next(
            (item for item in idb_after_normal_close["entries"] if item["key"] == "/savesth08/score.dat"),
            None,
        )
        if not closed_score or closed_score.get("bytes") != fixture_size:
            raise RuntimeError(
                f"TH08 score.dat was lost by normal Launcher close/sync: {idb_after_normal_close}"
            )

        # Prove persistence across another complete document/Runtime reload,
        # including the Launcher's non-launched export path.
        prepare_launcher(page, "reload")
        export_save(page, prelaunch_path)
        prelaunch_size = os.path.getsize(prelaunch_path)
        prelaunch_hash = sha256(prelaunch_path)
        if fixture_size != prelaunch_size or fixture_hash != prelaunch_hash:
            raise RuntimeError(
                f"TH08 score.dat changed across page reload before game launch: "
                f"{fixture_size}/{fixture_hash} -> {prelaunch_size}/{prelaunch_hash}"
            )
        idb_after_prelaunch_export = idb_save_state(page)
        exported_persisted = next(
            (item for item in idb_after_prelaunch_export["entries"] if item["key"] == "/savesth08/score.dat"),
            None,
        )
        if not exported_persisted or exported_persisted.get("bytes") != fixture_size:
            raise RuntimeError(
                f"TH08 score.dat was lost by the non-launched export Runtime teardown: {idb_after_prelaunch_export}"
            )

        # exportFiles() tears down the temporary not-yet-launched Runtime, so
        # the next Launch is a clean callMain() from the persisted save.
        page.evaluate("window.__th08SaveFirstFrame = false")
        second_state = launch_and_wait(page)
        page.wait_for_timeout(500)
        reloaded_listing = runtime_command(page, "list")
        score_entry = next((item for item in reloaded_listing.get("files", []) if item.get("path") == "score.dat"), None)
        if not score_entry or score_entry.get("size") != fixture_size:
            raise RuntimeError(f"TH08 imported score.dat did not survive full reload: {reloaded_listing}")
        export_save(page, after_path)
        after_size = os.path.getsize(after_path)
        after_hash = sha256(after_path)

        if fixture_size != after_size or fixture_hash != after_hash:
            raise RuntimeError(
                f"TH08 score.dat changed across import/reload: {fixture_size}/{fixture_hash} -> {after_size}/{after_hash}"
            )
        if page_errors:
            raise RuntimeError(f"page errors: {page_errors}")

        def is_expected_console_error(message):
            if message.startswith("th08-web:"):
                return True
            # Playwright WebKit does not expose Web Audio in this headless
            # environment. TH07 already treats this as an optional-audio
            # capability failure rather than a Runtime launch failure, and
            # TH08 likewise continues without an audio device in music=none.
            if (
                BROWSER_ENGINE == "webkit"
                and message == "th08-modern: SDL audio initialization failed: No audio context available"
            ):
                return True
            return False

        unexpected_console_errors = [message for message in console_errors if not is_expected_console_error(message)]
        if unexpected_console_errors:
            raise RuntimeError(f"unexpected browser console errors: {Counter(unexpected_console_errors)}")

        print(
            f"TH08 save browser E2E ({BROWSER_ENGINE}): PASS "
            f"bytes={fixture_size} sha256={fixture_hash} "
            f"first={first_state['frameSrc']} second={second_state['frameSrc']} "
            f"runtimeStderrDiagnostics={len(console_errors)}"
        )
        if console_errors:
            print("TH08 Runtime stderr diagnostics:")
            for message, count in Counter(console_errors).most_common():
                print(f"  {count}x {message}")
        browser.close()


if __name__ == "__main__":
    main()
