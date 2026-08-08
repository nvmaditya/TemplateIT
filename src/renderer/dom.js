/** DOM helpers + toast. */

export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => [...document.querySelectorAll(sel)];

export function showToast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    el.hidden = true;
  }, 2200);
}

export function setView(name, state) {
  state.view = name;
  $$('.view').forEach((v) => {
    v.classList.toggle('hidden', v.dataset.view !== name);
  });
}
