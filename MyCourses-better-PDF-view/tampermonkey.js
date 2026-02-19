// ==UserScript==
// @name         MyCourses better PDF View
// @namespace    https://tampermonkey.net/
// @version      1
// @match        https://mycourses2.mcgill.ca/d2l/le/lessons/*
// @match        https://mycourses2.mcgill.ca/d2l/le/content/*
// @match        https://mycourses2.mcgill.ca/d2l/home/*
// @match        https://mycourses2.mcgill.ca/d2l/lp/ouHome/*
// @run-at       document-idle
// @grant        GM_addStyle
// ==/UserScript==

(() => {
  "use strict";

  const KEY = "tm_bs_hide_header";
  const BTN = "tm-bs-toggle-header";

  GM_addStyle(`
    #${BTN}{
      position:fixed; top:8px; left:8px; z-index:2147483647;
      font:12px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      padding:6px 10px; border-radius:10px; cursor:pointer; user-select:none;
      border:1px solid rgba(255,255,255,.25); color:#fff; background:rgba(0,0,0,.62);
      box-shadow:0 4px 14px rgba(0,0,0,.25);
    }
    #${BTN}:hover{ background:rgba(0,0,0,.75); }
    #${BTN}:active{ transform:translateY(1px); }
  `);

  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const imp = (el, p, v) => el && el.style.setProperty(p, v, "important");
  const clr = (el, p) => el && el.style.removeProperty(p);

  const state = {
    hidden: (() => {
      try {
        return localStorage.getItem(KEY) !== "0";
      } catch {
        return true;
      }
    })(),
  };

  function header() {
    return qs("header");
  }

  function iframes() {
    const fra = qs(".d2l-fra-iframe");
    const inFra = fra ? qsa("iframe", fra) : [];
    if (inFra.length) return { fra, list: inFra };
    const big = qsa("iframe").filter((f) => {
      const r = f.getBoundingClientRect();
      return r.width > 200 && r.height > 200;
    });
    return { fra, list: big };
  }

  function apply() {
    const h = header();
    if (h) {
      if (h.dataset.tmOrigDisplay === undefined)
        h.dataset.tmOrigDisplay = h.style.display || "";
      if (state.hidden) imp(h, "display", "none");
      else {
        clr(h, "display");
        h.style.display = h.dataset.tmOrigDisplay || "";
      }
    }

    const { fra, list } = iframes();
    if (state.hidden) {
      if (fra) {
        imp(fra, "height", "100vh");
        imp(fra, "min-height", "100vh");
      }
      list.forEach((f) => {
        imp(f, "height", "100vh");
        imp(f, "min-height", "100vh");
        imp(f, "width", "100%");
      });
    } else {
      if (fra) {
        clr(fra, "height");
        clr(fra, "min-height");
      }
      list.forEach((f) => {
        clr(f, "height");
        clr(f, "min-height");
        clr(f, "width");
      });
    }

    const btn = qs(`#${BTN}`);
    if (btn)
      btn.title = state.hidden
        ? "Show Brightspace header"
        : "Hide Brightspace header";
  }

  function save() {
    try {
      localStorage.setItem(KEY, state.hidden ? "1" : "0");
    } catch {}
  }

  function ensureButton() {
    if (qs(`#${BTN}`)) return;
    const b = document.createElement("button");
    b.id = BTN;
    b.type = "button";
    b.textContent = "Toggle header";
    b.addEventListener("mousedown", (e) => e.stopPropagation(), true);
    b.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        state.hidden = !state.hidden;
        save();
        apply();
      },
      true,
    );
    document.body.appendChild(b);
  }

  function init() {
    ensureButton();
    apply();
    new MutationObserver(() => {
      ensureButton();
      apply();
    }).observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("resize", apply);
  }

  document.body ? init() : window.addEventListener("DOMContentLoaded", init);
})();
