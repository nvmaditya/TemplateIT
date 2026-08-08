/** Sidebar library list + template menu actions. */

import { $, $$, showToast } from './dom.js';
import { formatWhen } from './format.js';
import { openModal } from './modal.js';
import { api, actions, state } from './state.js';

export function closeAllMenus() {
  $$('.template-menu-pop').forEach((p) => p.classList.remove('open'));
  state.openMenuId = null;
}

export function syncArchiveToggle() {
  const btn = $('#btn-toggle-archived');
  if (!btn) return;
  btn.setAttribute('aria-pressed', state.showArchived ? 'true' : 'false');
  btn.title = state.showArchived ? 'Show active library' : 'Show archived';
}

export async function refreshList() {
  const list = await api().listTemplates(
    state.showArchived ? { onlyArchived: true } : { includeArchived: false }
  );
  const ul = $('#template-list');
  ul.innerHTML = '';
  $('#lib-mode-hint').hidden = !state.showArchived;

  if (!list.length) {
    const li = document.createElement('li');
    li.innerHTML = `<p class="hint" style="margin:0">${
      state.showArchived ? 'No archived templates' : 'No templates yet'
    }</p>`;
    ul.appendChild(li);
    return list;
  }

  for (const t of list) {
    const li = document.createElement('li');
    li.className = 'template-row';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'template-item' + (state.current?.id === t.id ? ' active' : '');
    btn.innerHTML = `<span class="t-title"></span><span class="t-meta"></span>`;
    btn.querySelector('.t-title').textContent = t.title || 'Untitled';
    btn.querySelector('.t-meta').textContent =
      (t.archived ? 'Archived · ' : '') +
      (t.pinned ? 'Pinned · ' : '') +
      formatWhen(t.updatedAt);
    if (t.pinned) btn.classList.add('is-pinned');
    btn.addEventListener('click', () => actions.openTemplate(t.id));

    const menuWrap = document.createElement('div');
    menuWrap.className = 'template-menu';
    const menuBtn = document.createElement('button');
    menuBtn.type = 'button';
    menuBtn.className = 'template-menu-btn';
    menuBtn.setAttribute('aria-label', 'Template actions');
    menuBtn.innerHTML = '<i class="ph-light ph-dots-three"></i>';
    const pop = document.createElement('div');
    pop.className = 'template-menu-pop';

    const menuActions = [
      { label: 'Rename', icon: 'ph-pencil-simple', run: () => renameTemplate(t) },
      {
        label: t.pinned ? 'Unpin from home' : 'Pin to home',
        icon: 'ph-push-pin',
        run: () => togglePin(t),
      },
      {
        label: t.archived ? 'Unarchive' : 'Archive',
        icon: t.archived ? 'ph-arrow-u-up-left' : 'ph-archive',
        run: () => toggleArchive(t),
      },
      {
        label: 'Delete',
        icon: 'ph-trash',
        danger: true,
        run: () => deleteTemplateConfirm(t),
      },
    ];

    for (const a of menuActions) {
      const ab = document.createElement('button');
      ab.type = 'button';
      if (a.danger) ab.className = 'danger';
      ab.innerHTML = `<i class="ph-light ${a.icon}"></i><span></span>`;
      ab.querySelector('span').textContent = a.label;
      ab.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllMenus();
        a.run();
      });
      pop.appendChild(ab);
    }

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = state.openMenuId !== t.id;
      closeAllMenus();
      if (willOpen) {
        pop.classList.add('open');
        state.openMenuId = t.id;
      }
    });

    menuWrap.append(menuBtn, pop);
    li.append(btn, menuWrap);
    ul.appendChild(li);
  }
  return list;
}

function renameTemplate(t) {
  openModal({
    title: 'Rename template',
    desc: 'Update the library title. Body and history stay the same.',
    bodyHtml: `<input type="text" class="input" id="modal-input" autocomplete="off" />`,
    confirmLabel: 'Rename',
    onConfirm: async () => {
      const title = ($('#modal-input')?.value || '').trim();
      if (!title) {
        showToast('Title cannot be empty');
        return false;
      }
      const updated = await api().updateTemplate(t.id, { title });
      if (state.current?.id === t.id) {
        state.current = updated;
        $('#field-title').value = updated.title;
        $('#editor-heading').textContent = updated.title;
      }
      await refreshList();
      showToast('Renamed');
    },
  });
  queueMicrotask(() => {
    const input = $('#modal-input');
    if (input) {
      input.value = t.title || '';
      input.select();
    }
  });
}

async function togglePin(t) {
  const pinned = !t.pinned;
  const updated = await api().updateTemplate(t.id, { pinned });
  if (state.current?.id === t.id) state.current = updated;
  await refreshList();
  if (state.view === 'empty') await actions.renderPinnedHome();
  showToast(pinned ? 'Pinned to home' : 'Unpinned from home');
}

async function toggleArchive(t) {
  const archived = !t.archived;
  const updated = await api().updateTemplate(t.id, {
    archived,
    ...(archived ? { pinned: false } : {}),
  });
  if (state.current?.id === t.id) {
    state.current = updated;
    if (archived && !state.showArchived) await actions.goHome();
  }
  await refreshList();
  if (state.view === 'empty') await actions.renderPinnedHome();
  showToast(archived ? 'Archived' : 'Restored from archive');
}

function deleteTemplateConfirm(t) {
  openModal({
    title: 'Delete template?',
    desc: `“${t.title || 'Untitled'}” and all of its fill history will be permanently removed.`,
    bodyHtml: '',
    confirmLabel: 'Delete',
    onConfirm: async () => {
      await api().deleteTemplate(t.id);
      if (state.current?.id === t.id) await actions.goHome();
      await refreshList();
      if (state.view === 'empty') await actions.renderPinnedHome();
      showToast('Deleted');
    },
  });
}

export function registerLibraryActions() {
  actions.refreshList = refreshList;
  actions.syncArchiveToggle = syncArchiveToggle;
}

export function bindLibraryChrome() {
  $('#btn-toggle-archived').addEventListener('click', async () => {
    state.showArchived = !state.showArchived;
    syncArchiveToggle();
    await refreshList();
  });
  document.addEventListener('click', () => closeAllMenus());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllMenus();
  });
  syncArchiveToggle();
}
