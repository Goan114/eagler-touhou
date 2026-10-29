from pathlib import Path
import json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);report=[]
 for name,width,height,mobile in [('desktop',1440,1000,False),('mobile',390,844,True)]:
  c=b.new_context(viewport={'width':width,'height':height},is_mobile=mobile,has_touch=mobile);page=c.new_page();page.goto('https://test.touhou.vip/',wait_until='load');page.wait_for_timeout(1500);page.evaluate("document.querySelector('#firstUseNoticeDialog')?.close()");shelf=page.locator('.classics-shelf');shelf.scroll_into_view_if_needed();page.screenshot(path=f'artifacts/th13-port-20261029/classics-{name}.png',full_page=True);assert shelf.locator('a.game').count()==5;order=page.locator('.game-library>section').evaluate_all('(xs)=>xs.map(x=>x.dataset.shelf)');assert order==['singleplayer','classics','multiplayer'];card=shelf.locator('a.game').first;card.scroll_into_view_if_needed();card.tap() if mobile else card.click();page.wait_for_url('**/th01/lan.html?network=public',timeout=20000);report.append({'viewport':name,'order':order,'cards':5,'nativeNavigation':page.url});c.close()
 b.close();Path('artifacts/th13-port-20261029/classics-browser.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS desktop/mobile shelf order, five cards, native navigation')
