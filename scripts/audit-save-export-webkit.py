import hashlib
import os
import sys
import time

from playwright.sync_api import sync_playwright


URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8168/eagler-touhou/"
GAME = sys.argv[2] if len(sys.argv) > 2 else "th07"
FIXTURE = os.path.abspath(sys.argv[3]) if len(sys.argv) > 3 else ""
MODE = sys.argv[4] if len(sys.argv) > 4 else "score-only"
if GAME not in {"th06", "th07", "th08"}:
    raise SystemExit("game must be th06, th07, or th08")
if MODE not in {"score-only", "launch-before-export"}:
    raise SystemExit("mode must be score-only or launch-before-export")
if not FIXTURE or not os.path.isfile(FIXTURE):
    raise SystemExit(f"score.dat fixture not found: {FIXTURE}")

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_DIR = os.path.join(ROOT, "artifacts", "save-export-webkit-audit")
os.makedirs(OUT_DIR, exist_ok=True)
EXPORTED = os.path.join(OUT_DIR, f"{GAME}-score-exported.dat")
SAVE_ROOT = {
    "th06": "/savesth06",
    "th07": "/savesth07",
    "th08": "/savesth08",
}[GAME]


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def prepare_launcher(page, suffix):
    page.goto(f"{URL}?save-export-webkit-audit={GAME}-{suffix}-{int(time.time())}", wait_until="load", timeout=30000)
    page.wait_for_function(
        f"window.__eaglerBoot?.done === true && !!document.querySelector(\"[data-game='{GAME}']\")",
        timeout=30000,
    )
    page.evaluate(
        """([game]) => {
          localStorage.setItem('eagler-touhou-changelog-seen-20260822-1', '1');
          document.querySelector('#changelogDialog')?.close();
          const key = `eagler-touhou-game-options-v1-${game}`;
          let saved = {};
          try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch {}
          localStorage.setItem(key, JSON.stringify({
            ...saved,
            music: 'none',
            musicPreferenceExplicit: true,
            options: saved.options || {},
          }));
          window.__saveAuditFirstFrame = false;
          window.addEventListener('message', event => {
            const message = event.data || {};
            if (message.protocol === 'eagler-touhou/1' && message.game === game && message.event === 'first-frame') {
              window.__saveAuditFirstFrame = true;
            }
          });
          document.querySelector(`[data-game='${game}']:not(.game-multiplayer)`)?.click();
        }""",
        [GAME],
    )


def launch_and_wait(page):
    page.evaluate("document.getElementById('launch')?.click()")
    deadline = time.time() + 120
    last = None
    while time.time() < deadline:
        try:
            if page.locator("#decisionDialog").evaluate("dialog => dialog.open"):
                page.locator("#decisionConfirm").click()
        except Exception:
            pass
        last = page.evaluate(
            """() => ({
              firstFrame: window.__saveAuditFirstFrame === true,
              status: document.getElementById('playerStatus')?.textContent || '',
              hostStatus: document.getElementById('status')?.textContent || '',
              frameSrc: document.getElementById('gameFrame')?.src || '',
            })"""
        )
        if last["firstFrame"] and last["status"] == "运行中":
            return last
        combined = "\n".join([last["status"], last["hostStatus"]]).lower()
        if any(token in combined for token in ["referenceerror", "typeerror", "失败", "错误", "超时"]):
            raise RuntimeError(f"{GAME} launch failed: {last}")
        time.sleep(0.25)
    raise TimeoutError(f"{GAME} launch timed out: {last}")


def import_save(page):
    page.locator("#saveFileTool [data-action='import-save']").evaluate("element => element.click()")
    page.wait_for_function("document.getElementById('decisionDialog')?.open === true", timeout=10000)
    with page.expect_file_chooser(timeout=10000) as chooser_info:
        page.locator("#decisionConfirm").click()
    chooser_info.value.set_files(FIXTURE)
    page.wait_for_function(
        "document.getElementById('status')?.textContent?.includes('已导入 1 个文件')",
        timeout=60000,
    )


def export_save(page):
    with page.expect_download(timeout=30000) as download_info:
        page.locator("#saveFileTool [data-action='export-save']").evaluate("element => element.click()")
    download_info.value.save_as(EXPORTED)


def idb_entries(page):
    return page.evaluate(
        """async (databaseName) => {
          const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open(databaseName);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          try {
            if (!db.objectStoreNames.contains('FILE_DATA')) return [];
            return await new Promise((resolve, reject) => {
              const transaction = db.transaction(['FILE_DATA'], 'readonly');
              const store = transaction.objectStore('FILE_DATA');
              const output = [];
              const request = store.openCursor();
              request.onsuccess = event => {
                const cursor = event.target.result;
                if (!cursor) { resolve(output); return; }
                const value = cursor.value || {};
                output.push({ key: String(cursor.key), bytes: value.contents?.byteLength ?? value.contents?.length ?? null });
                cursor.continue();
              };
              request.onerror = () => reject(request.error);
            });
          } finally {
            db.close();
          }
        }""",
        SAVE_ROOT,
    )


def main():
    fixture_size = os.path.getsize(FIXTURE)
    fixture_hash = sha256(FIXTURE)
    with sync_playwright() as playwright:
        browser = playwright.webkit.launch(headless=True)
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()

        prepare_launcher(page, "initial")
        launch_and_wait(page)
        import_save(page)

        if MODE == "launch-before-export":
            prepare_launcher(page, "direct-launch")
            launch_and_wait(page)
            page.wait_for_timeout(500)

        # Recreate the exact non-launched export path that exposed the TH08
        # WebKit teardown issue: document reload -> temporary Runtime restore
        # and read -> exportFiles() resetRuntime() -> inspect IDB immediately.
        prepare_launcher(page, "pre-export")
        before = idb_entries(page)
        before_score = next((item for item in before if item["key"] == f"{SAVE_ROOT}/score.dat"), None)
        if not before_score or before_score.get("bytes") != fixture_size:
            raise RuntimeError(f"{GAME} imported score.dat was not durable before export: {before}")

        export_save(page)
        if os.path.getsize(EXPORTED) != fixture_size or sha256(EXPORTED) != fixture_hash:
            raise RuntimeError(f"{GAME} exported score.dat changed")

        after = idb_entries(page)
        after_score = next((item for item in after if item["key"] == f"{SAVE_ROOT}/score.dat"), None)
        if not after_score or after_score.get("bytes") != fixture_size:
            raise RuntimeError(
                f"{GAME} score.dat was lost by non-launched export Runtime teardown: before={before} after={after}"
            )

        print(
            f"SAVE_EXPORT_WEBKIT_AUDIT PASS game={GAME} mode={MODE} bytes={fixture_size} sha256={fixture_hash} "
            f"before={before} after={after}"
        )
        browser.close()


if __name__ == "__main__":
    main()
