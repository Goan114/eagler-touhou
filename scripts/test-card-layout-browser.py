"""Local browser regression for card motion; requires Python Playwright/Chromium."""
import argparse
import json

from playwright.sync_api import sync_playwright


PROBE = """() => {
  const images = () => [...document.querySelectorAll('.game:not([hidden]) .card-art-image')]
    .filter(i => getComputedStyle(i.parentElement).display !== 'none');
  const picture = image => {
    const r = image.getBoundingClientRect();
    const s = Math.max(r.width / image.naturalWidth, r.height / image.naturalHeight);
    const anchor = parseFloat(getComputedStyle(image).objectPosition) / 100;
    return [r.left + (r.width - image.naturalWidth * s) * anchor,
      r.top + (r.height - image.naturalHeight * s) / 2,
      image.naturalWidth * s, image.naturalHeight * s];
  };
  const animations = () => document.getAnimations().filter(a => a.effect.target.closest?.('.game, .tools'));
  window.cardProbe = {
    picture, images, animations,
    freeze(time) { for (const a of animations()) { a.pause(); a.currentTime = time; } },
    continuity(selector) {
      const nodes = images(), before = nodes.map(picture), previous = new Set(animations());
      document.querySelector(selector).click();
      for (const a of animations()) if (!previous.has(a)) { a.pause(); a.currentTime = 0; }
      return Math.max(...nodes.flatMap((node, i) => picture(node).map((v, k) => Math.abs(v - before[i][k]))));
    },
    distortion() {
      return Math.max(...images().filter(i => i.style.width).map(i => {
        const r = i.getBoundingClientRect();
        return Math.abs((r.width / r.height) / (i.naturalWidth / i.naturalHeight) - 1);
      }));
    },
    finish() { for (const a of animations()) a.finish(); },
    clean() { return !document.querySelector('.card-layout-motion') &&
      !images().some(i => i.style.width || i.style.height); }
  };
}"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("url", nargs="?", default="http://127.0.0.1:8130/eagler-touhou/")
    args = parser.parse_args()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={"width": 1280, "height": 800}, service_workers="block")
        context.add_init_script("localStorage.setItem('eagler-touhou-changelog-seen-20260822-1', '1')")
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(args.url)
        page.wait_for_function("[...document.querySelectorAll('.card-art-image')].length === 10 && [...document.querySelectorAll('.card-art-image')].every(i => i.naturalWidth)")
        page.wait_for_timeout(1400)
        page.evaluate(PROBE)
        deltas = []
        for selector in [".game-th08", ".game-th07:not(.game-multiplayer)", ".game-th06mp", ".game-th06:not(.game-multiplayer)"]:
            delta = page.evaluate("s => cardProbe.continuity(s)", selector)
            deltas.append(delta)
            assert delta < 1, f"Artwork jumps at selection/interruption: {delta}px"
            for time in [75, 200, 400, 700, 849]:
                page.evaluate("t => cardProbe.freeze(t)", time)
                assert page.evaluate("cardProbe.distortion()") < .003, "Artwork stretches"
            # Next click interrupts a visible intermediate frame.
            page.evaluate("cardProbe.freeze(275)")
        end_frame = page.evaluate("() => { cardProbe.finish(); return cardProbe.images().map(cardProbe.picture); }")
        page.wait_for_function("cardProbe.clean()")
        settled = page.evaluate("cardProbe.images().map(cardProbe.picture)")
        assert max(abs(a - b) for start, end in zip(end_frame, settled) for a, b in zip(start, end)) < 1, "Artwork jumps on animation cleanup"
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")

        # A natural (unpaused) run must remain bounded, not lay out every frame.
        client = context.new_cdp_session(page)
        client.send("Performance.enable")
        metrics = lambda: {m["name"]: m["value"] for m in client.send("Performance.getMetrics")["metrics"]}
        before = metrics()
        page.evaluate("document.querySelector('.game-th08').click()")
        page.wait_for_timeout(1400)
        after = metrics()
        layouts = after["LayoutCount"] - before["LayoutCount"]
        assert layouts <= 8, f"Per-frame layout regression: {layouts}"
        assert page.evaluate("cardProbe.clean()")

        for category in ["original", "multiplayer", "all"]:
            page.locator(f'[data-card-filter="{category}"]').click()
            page.wait_for_function("!document.querySelector('#main').inert")
            page.evaluate("document.querySelector('.game:not([hidden])').click()")
            page.wait_for_timeout(100)
        page.emulate_media(reduced_motion="reduce")
        page.wait_for_timeout(100)
        assert page.evaluate("cardProbe.clean()")
        page.emulate_media(reduced_motion="no-preference")

        page.evaluate("document.querySelector('.game-th07').click()")
        page.wait_for_timeout(100)
        page.locator('#lessMotionToggle').click()
        assert page.evaluate("cardProbe.clean()")
        page.locator('#lessMotionToggle').click()
        page.evaluate("document.querySelector('.game-th08').click()")
        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(350)
        assert page.evaluate("cardProbe.clean()")
        page.evaluate("document.querySelector('.game-th06').click()")
        page.wait_for_timeout(350)
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        assert not errors, errors
        print(json.dumps({"browser": browser.version, "continuity_error_px": deltas,
                          "switch_layouts": layouts, "result": "PASS"}))
        browser.close()


if __name__ == "__main__":
    main()
