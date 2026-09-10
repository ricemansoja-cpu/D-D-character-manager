(() => {
  const URL = 'https://wmeuebjbvoqudhpwtxyn.supabase.co';
  const KEY = 'sb_publishable_jYrKnt_Unuv5M6XT1t0AaQ_quQTOpCD';
  const db = window.supabase?.createClient(URL, KEY);
  const root = document.querySelector('#dashboard-view');
  if (!db || !root) return;

  const lang = () => localStorage.getItem('preferredLanguage') || 'en';
  const T = {
    en: {
      delete: 'Delete campaign', leave: 'Leave campaign',
      titleDelete: 'Delete campaign', titleLeave: 'Leave campaign',
      confirmDelete: 'This permanently deletes the campaign, its invitations and links. Type "supprimer" to confirm.',
      confirmLeave: 'You will leave this campaign and unlink your character. Type "supprimer" to confirm.',
      cancel: 'Cancel', confirm: 'Delete', confirmLeaveButton: 'Leave',
      deleted: 'Campaign deleted.', left: 'You left the campaign.',
      error: 'Unable to complete the action.'
    },
    fr: {
      delete: 'Supprimer la campagne', leave: 'Quitter la campagne',
      titleDelete: 'Supprimer la campagne', titleLeave: 'Quitter la campagne',
      confirmDelete: 'Cette action supprime définitivement la campagne, ses invitations et ses liens. Saisissez « supprimer » pour confirmer.',
      confirmLeave: 'Vous quitterez cette campagne et votre personnage sera détaché. Saisissez « supprimer » pour confirmer.',
      cancel: 'Annuler', confirm: 'Supprimer', confirmLeaveButton: 'Quitter',
      deleted: 'Campagne supprimée.', left: 'Vous avez quitté la campagne.',
      error: 'Impossible d’effectuer cette action.'
    }
  };
  const t = k => T[lang()][k] || k;
  const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
  let user = null;

  const style = document.createElement('style');
  style.textContent = `
    .mj-campaign-management{margin-top:12px;padding-top:12px;border-top:1px solid var(--border,#374151)}
    .mj-campaign-management .campaign-danger{border-color:#7f1d1d!important}
    .mj-campaign-confirm{position:fixed;inset:0;z-index:12000;display:flex;align-items:center;justify-content:center;padding:16px}
    .mj-campaign-confirm-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.72)}
    .mj-campaign-confirm-card{position:relative;width:min(500px,100%);padding:22px;border-radius:16px;background:var(--surface,#111827);border:1px solid var(--border,#374151);box-shadow:0 20px 60px rgba(0,0,0,.4)}
    .mj-campaign-confirm-card p{line-height:1.5}
    .mj-campaign-confirm-card input{width:100%;margin:12px 0}
    .mj-campaign-confirm-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
  `;
  document.head.appendChild(style);

  async function getUser() {
    const { data } = await db.auth.getSession();
    user = data.session?.user || null;
    return user;
  }

  async function getRole(campaignId) {
    const { data } = await db.from('campaigns').select('owner_user_id').eq('id', campaignId).maybeSingle();
    if (data?.owner_user_id === user?.id) return 'gm';
    const { data: member } = await db.from('campaign_members').select('role').eq('campaign_id', campaignId).eq('user_id', user?.id).eq('status', 'active').maybeSingle();
    return member?.role || null;
  }

  function addActions(card, campaignId, role, campaignName) {
    if (card.querySelector('.mj-campaign-management')) return;
    const wrap = document.createElement('div');
    wrap.className = 'mj-campaign-management';
    wrap.innerHTML = `<button type="button" class="button button-secondary campaign-danger-button">${role === 'gm' ? t('delete') : t('leave')}</button>`;
    card.appendChild(wrap);
    wrap.querySelector('button').onclick = () => confirmAction(campaignId, role, campaignName);
  }

  async function decorateCampaigns() {
    if (!user) return;
    const cards = [...root.querySelectorAll('#mj-campaigns .mj-card')];
    for (const card of cards) {
      if (card.querySelector('.mj-campaign-management')) continue;
      const open = card.querySelector('.mj-open');
      const campaignId = open?.dataset.id;
      if (!campaignId) continue;
      const name = card.querySelector('h3')?.textContent?.trim() || 'campaign';
      const role = await getRole(campaignId);
      if (role === 'gm' || role === 'player') addActions(card, campaignId, role, name);
    }
  }

  function confirmAction(id, role, name) {
    const deleting = role === 'gm';
    const modal = document.createElement('div');
    modal.className = 'mj-campaign-confirm';
    modal.innerHTML = `<div class="mj-campaign-confirm-backdrop"></div>
      <section class="mj-campaign-confirm-card" role="dialog" aria-modal="true" aria-labelledby="mj-campaign-confirm-title">
        <h3 id="mj-campaign-confirm-title">${deleting ? t('titleDelete') : t('titleLeave')}</h3>
        <p><strong>${esc(name)}</strong></p>
        <p>${deleting ? t('confirmDelete') : t('confirmLeave')}</p>
        <input id="mj-campaign-confirm-input" autocomplete="off" placeholder="supprimer" aria-label="supprimer">
        <div class="mj-campaign-confirm-actions">
          <button type="button" class="button button-secondary" id="mj-campaign-confirm-cancel">${t('cancel')}</button>
          <button type="button" class="button ${deleting ? 'button-danger' : 'button-primary'}" id="mj-campaign-confirm-ok" disabled>${deleting ? t('confirm') : t('confirmLeaveButton')}</button>
        </div>
      </section>`;
    document.body.appendChild(modal);
    const input = modal.querySelector('#mj-campaign-confirm-input');
    const ok = modal.querySelector('#mj-campaign-confirm-ok');
    const close = () => modal.remove();
    input.oninput = () => { ok.disabled = input.value.trim().toLowerCase() !== 'supprimer'; };
    modal.querySelector('#mj-campaign-confirm-cancel').onclick = close;
    modal.querySelector('.mj-campaign-confirm-backdrop').onclick = close;
    input.onkeydown = e => { if (e.key === 'Escape') close(); };
    ok.onclick = async () => {
      ok.disabled = true;
      const { error } = await db.rpc(deleting ? 'delete_campaign' : 'leave_campaign', { p_campaign_id: id });
      if (error) {
        alert(error.message || t('error'));
        ok.disabled = false;
        return;
      }
      close();
      const message = root.querySelector('#mj-msg');
      if (message) {
        message.textContent = deleting ? t('deleted') : t('left');
        message.className = 'status-message success';
      }
      const openButton = root.querySelector(`#mj-campaigns .mj-open[data-id="${CSS.escape(id)}"]`);
      if (openButton) openButton.closest('.mj-card')?.remove();
    };
    input.focus();
  }

  async function init() {
    await getUser();
    if (!user) return;
    decorateCampaigns();
    const observer = new MutationObserver(() => decorateCampaigns());
    observer.observe(root.querySelector('#mj-campaigns') || root, { childList: true, subtree: true });
    window.addEventListener('language-changed', () => setTimeout(decorateCampaigns, 0));
  }
  init();
})();