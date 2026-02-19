(() => {
  "use strict";

  const KEY_RUNNING = "minerva_optout_running";
  const KEY_QUEUE = "minerva_optout_queue";
  const KEY_INDEX = "minerva_optout_index";

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const storageGet = (keys) =>
    new Promise((resolve) => chrome.storage.local.get(keys, resolve));

  const storageSet = (obj) =>
    new Promise((resolve) => chrome.storage.local.set(obj, resolve));

  const storageRemove = (keys) =>
    new Promise((resolve) => chrome.storage.local.remove(keys, resolve));

  const getQueue = async () => {
    const data = await storageGet([KEY_QUEUE]);
    const raw = data[KEY_QUEUE] ?? "[]";
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  };

  const setQueue = async (q) => storageSet({ [KEY_QUEUE]: JSON.stringify(q) });

  const getIndex = async () => {
    const data = await storageGet([KEY_INDEX]);
    return Number(data[KEY_INDEX] ?? 0);
  };

  const setIndex = async (i) => storageSet({ [KEY_INDEX]: Number(i) });

  const isRunning = async () => {
    const data = await storageGet([KEY_RUNNING]);
    return Boolean(data[KEY_RUNNING] ?? false);
  };

  const setRunning = async (v) => storageSet({ [KEY_RUNNING]: Boolean(v) });

  const stopRun = async (msg = "Stopped.") => {
    await setRunning(false);
    await storageRemove([KEY_QUEUE, KEY_INDEX]);
    console.log("[SSMUOptOut]", msg);
    alert("[SSMUOptOut] " + msg);
  };

  const isListPage = () =>
    document.querySelector('a[href*="bztkopto.pm_agree_opt_out"]') !== null;

  const isAgreementPage = () =>
    document.querySelector(
      'form[action*="bztkopto.pm_confirm_opt_out"] input[type="submit"][value="Opt-out"]',
    ) !== null;

  const isConfirmationPage = () =>
    document.querySelector(
      'form[action*="bztkopto.pm_opt_out_processing"] input[type="submit"][value="Go Back"]',
    ) !== null;

  const addStyle = (css) => {
    const style = document.createElement("style");
    style.textContent = css;
    document.documentElement.appendChild(style);
  };

  function buildPanel(items, onStart, onStop) {
    const existing = document.getElementById("ssmu-optout-panel");
    if (existing) return existing;

    const panel = document.createElement("div");
    panel.id = "ssmu-optout-panel";

    panel.innerHTML = `
      <div class="title">SSMU Fee Opt-Out Automator</div>
      <div class="row">
        <button id="ssmu-optout-start">Start</button>
        <button id="ssmu-optout-stop" class="danger">Stop</button>
      </div>
      <div class="small">
        Select which fees to opt-out. Uncheck any fee you want to keep.
      </div>
      <details open class="dropdown">
        <summary>Fees found (${items.length})</summary>
        <div class="list" id="ssmu-optout-list"></div>
      </details>
      <div class="row small">
        <button id="ssmu-optout-all" class="secondary">Select all</button>
        <button id="ssmu-optout-none" class="secondary">Select none</button>
      </div>
    `;

    const list = panel.querySelector("#ssmu-optout-list");

    for (const item of items) {
      const id = `fee_${item.code}`;
      const line = document.createElement("label");
      line.className = "item";
      line.innerHTML = `
        <input type="checkbox" id="${id}" checked />
        <span class="code">${item.code}</span>
        <span class="desc">${item.desc}</span>
      `;
      list.appendChild(line);
    }

    panel.querySelector("#ssmu-optout-all").addEventListener("click", () => {
      list
        .querySelectorAll('input[type="checkbox"]')
        .forEach((x) => (x.checked = true));
    });

    panel.querySelector("#ssmu-optout-none").addEventListener("click", () => {
      list
        .querySelectorAll('input[type="checkbox"]')
        .forEach((x) => (x.checked = false));
    });

    panel
      .querySelector("#ssmu-optout-start")
      .addEventListener("click", async () => {
        const selectedCodes = new Set(
          [...list.querySelectorAll('input[type="checkbox"]')]
            .filter((cb) => cb.checked)
            .map((cb) => cb.id.replace("fee_", "")),
        );

        const selectedItems = items.filter((it) => selectedCodes.has(it.code));
        if (selectedItems.length === 0) {
          alert("[SSMUOptOut] Nothing selected.");
          return;
        }
        await onStart(selectedItems);
      });

    panel.querySelector("#ssmu-optout-stop").addEventListener("click", onStop);

    document.body.appendChild(panel);
    return panel;
  }

  addStyle(`
    #ssmu-optout-panel {
      position: fixed;
      right: 16px;
      top: 16px;
      width: 360px;
      max-height: 80vh;
      overflow: auto;
      z-index: 999999;
      background: #111;
      color: #eee;
      border: 1px solid #444;
      border-radius: 12px;
      padding: 12px;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    }
    #ssmu-optout-panel .title {
      font-weight: 700;
      font-size: 14px;
      margin-bottom: 8px;
    }
    #ssmu-optout-panel .row {
      display: flex;
      gap: 8px;
      margin: 8px 0;
    }
    #ssmu-optout-panel button {
      cursor: pointer;
      border: 1px solid #444;
      border-radius: 10px;
      padding: 8px 10px;
      background: #222;
      color: #eee;
      font-weight: 600;
    }
    #ssmu-optout-panel button.secondary { background: #1b1b1b; }
    #ssmu-optout-panel button.danger { background: #3a1010; border-color: #6a1a1a; }
    #ssmu-optout-panel .small {
      font-size: 12px;
      opacity: 0.85;
      line-height: 1.3;
    }
    #ssmu-optout-panel details.dropdown {
      margin-top: 10px;
      border: 1px solid #333;
      border-radius: 10px;
      padding: 8px;
      background: #161616;
    }
    #ssmu-optout-panel summary {
      cursor: pointer;
      font-weight: 700;
    }
    #ssmu-optout-panel .list {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    #ssmu-optout-panel .item {
      display: grid;
      grid-template-columns: 18px auto 1fr;
      gap: 8px;
      align-items: center;
      padding: 6px;
      border-radius: 8px;
      background: #121212;
      border: 1px solid #2a2a2a;
    }
    #ssmu-optout-panel .code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
      opacity: 0.95;
    }
    #ssmu-optout-panel .desc {
      font-size: 12px;
      opacity: 0.9;
    }
  `);

  function parseListItems() {
    const reqLinks = [
      ...document.querySelectorAll('a[href*="bztkopto.pm_agree_opt_out"]'),
    ];

    const items = reqLinks.map((a) => {
      const href = new URL(a.getAttribute("href"), window.location.origin).href;

      let code = "????";
      try {
        const u = new URL(href);
        code = u.searchParams.get("detail_code_in") || code;
      } catch {}

      const tr = a.closest("tr");
      let desc = "Unknown fee";
      if (tr) {
        const firstCellLink = tr.querySelector("td.ntdefault a");
        if (firstCellLink && firstCellLink.textContent.trim()) {
          desc = firstCellLink.textContent.trim();
        }
      }

      return { code, desc, href };
    });

    const seen = new Set();
    return items.filter((it) => {
      if (seen.has(it.code)) return false;
      seen.add(it.code);
      return true;
    });
  }

  async function proceedFromListPage() {
    if (!(await isRunning())) return;

    const queue = await getQueue();
    const idx = await getIndex();

    if (!queue.length) {
      await stopRun("Queue was empty.");
      return;
    }
    if (idx >= queue.length) {
      await stopRun("Done! All selected fees processed.");
      return;
    }

    const next = queue[idx];
    await sleep(600);
    window.location.href = next.href;
  }

  async function proceedFromAgreementPage() {
    if (!(await isRunning())) return;

    const queue = await getQueue();
    const idx = await getIndex();

    if (!queue.length || idx >= queue.length) {
      await stopRun("Queue/index mismatch on agreement page.");
      return;
    }

    const expected = queue[idx]?.code;
    const hidden = document.querySelector(
      'form[action*="bztkopto.pm_confirm_opt_out"] input[name="detail_code_in"]',
    );
    const onPageCode = hidden?.value;

    if (!onPageCode || onPageCode !== expected) {
      await stopRun(
        `Safety stop: code mismatch.\nExpected: ${expected}\nFound: ${onPageCode || "none"}`,
      );
      return;
    }

    const optBtn = document.querySelector(
      'form[action*="bztkopto.pm_confirm_opt_out"] input[type="submit"][value="Opt-out"]',
    );

    if (!optBtn) {
      await stopRun("Couldn't find Opt-out button.");
      return;
    }

    await sleep(700);
    optBtn.click();
  }

  async function proceedFromConfirmationPage() {
    if (!(await isRunning())) return;

    const queue = await getQueue();
    const idx = await getIndex();

    if (!queue.length) {
      await stopRun("Queue missing on confirmation page.");
      return;
    }

    await setIndex(idx + 1);

    const backBtn = document.querySelector(
      'form[action*="bztkopto.pm_opt_out_processing"] input[type="submit"][value="Go Back"]',
    );

    if (!backBtn) {
      await stopRun("Couldn't find Go Back button.");
      return;
    }

    await sleep(700);
    backBtn.click();
  }

  (async function main() {
    if (isListPage()) {
      const items = parseListItems();

      buildPanel(
        items,
        async (selectedItems) => {
          await setQueue(selectedItems);
          await setIndex(0);
          await setRunning(true);
          alert(
            `[SSMUOptOut] Starting… Selected ${selectedItems.length} fees.`,
          );
          await proceedFromListPage();
        },
        async () => stopRun("Stopped by user."),
      );

      if (await isRunning()) {
        await proceedFromListPage();
      }
      return;
    }

    if (isAgreementPage()) {
      await proceedFromAgreementPage();
      return;
    }

    if (isConfirmationPage()) {
      await proceedFromConfirmationPage();
      return;
    }
  })();
})();
