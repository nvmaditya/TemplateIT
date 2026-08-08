/** Home / empty + pinned templates. */

import { $, setView } from './dom.js';
import { formatWhen } from './format.js';
import { api, actions, resetSessionFields, state } from './state.js';

export async function goHome() {
  resetSessionFields();
  setView('empty', state);
  await actions.refreshList();
  await renderPinnedHome();
}

export async function renderPinnedHome() {
  const section = $('#pinned-section');
  const grid = $('#pinned-grid');
  if (!section || !grid) return;
  const all = await api().listTemplates({ includeArchived: false });
  const pinned = all.filter((t) => t.pinned && !t.archived);
  grid.innerHTML = '';
  if (!pinned.length) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  for (const t of pinned) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'pinned-card';
    card.setAttribute('role', 'listitem');
    card.innerHTML = `
      <span class="pinned-card-pin" aria-hidden="true"><i class="ph-light ph-push-pin"></i></span>
      <span class="pinned-card-title"></span>
      <span class="pinned-card-meta"></span>
    `;
    card.querySelector('.pinned-card-title').textContent = t.title || 'Untitled';
    card.querySelector('.pinned-card-meta').textContent = formatWhen(t.updatedAt);
    card.addEventListener('click', () => actions.openTemplate(t.id));
    grid.appendChild(card);
  }
}

export function registerHomeActions() {
  actions.goHome = goHome;
  actions.renderPinnedHome = renderPinnedHome;
}
