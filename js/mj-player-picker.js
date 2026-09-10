(() => {
  const URL = 'https://wmeuebjbvoqudhpwtxyn.supabase.co';
  const KEY = 'sb_publishable_jYrKnt_Unuv5M6XT1t0AaQ_quQTOpCD';
  const db = window.supabase.createClient(URL, KEY);
  const root = document.querySelector('#dashboard-view');
  if (!root) return;

  const style = document.createElement('style');
  style.textContent = `
    .mj-autocomplete { position:relative; margin-top:10px; }
    .mj-autocomplete-list { position:absolute; z-index:20; left:0; right:0; top:100%; max-height:260px; overflow:auto; margin-top:4px; padding:4px; border:1px solid var(--border,#374151); border-radius:10px; background:var(--surface,#111827); box-shadow:0 10px 30px rgba(0,0,0,.3); }
    .mj-autocomplete-item { width:100%; display:flex; justify-content:space-between; align-items:center; gap:10px; padding:9px 10px; border:0; border-radius:7px; background:transparent; color:inherit; text-align:left; cursor:pointer; }
    .mj-autocomplete-item:hover, .mj-autocomplete-item:focus { background:rgba(127,127,127,.15); outline:none; }
    .mj-autocomplete-empty { padding:10px; opacity:.7; }
  `;
  document.head.appendChild(style);

  let players = [];
  let loaded = false;
  let loading = false;

  const getLang = () => localStorage.getItem('preferredLanguage') || 'en';
  const text = {
    en: { placeholder: 'Player username', loading: 'Loading players…', empty: 'No matching player', invite: 'Invite', invited: 'Invitation sent' },
    fr: { placeholder: 'Pseudo du joueur', loading: 'Chargement des joueurs…', empty: 'Aucun joueur correspondant', invite: 'Inviter', invited: 'Invitation envoyée' }
  };
  const t = key => text[getLang()][key];
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));

  async function loadPlayers() {
    if (loaded || loading) return;
    loading = true;
    const { data, error } = await db.from('profiles').select('id,username,display_name').order('username').limit(500);
    loading = false;
    if (error) throw error;
    players = (data || []).filter(p => p.username);
    loaded = true;
  }

  function findDetail(campaignId) {
    return root.querySelector(`#mj-detail-${CSS.escape(campaignId)}`);
  }

  async function inviteUI(campaignId) {
    const detail = findDetail(campaignId);
    if (!detail) return;
    detail.classList.remove('mj-hidden');
    detail.innerHTML = `<div class="mj-card"><label class="mj-autocomplete"><span>${esc(t('placeholder'))}</span><input class="mj-player-input" autocomplete="off" aria-autocomplete="list" aria-expanded="false" placeholder="${esc(t('placeholder'))}"><div class="mj-autocomplete-list mj-hidden" role="listbox"></div></label></div>`;

    const input = detail.querySelector('.mj-player-input');
    const list = detail.querySelector('.mj-autocomplete-list');
    try {
      await loadPlayers();
    } catch (error) {
      list.classList.remove('mj-hidden');
      list.innerHTML = `<div class="mj-autocomplete-empty">${esc(error.message || 'Unable to load players')}</div>`;
      return;
    }

    const render = () => {
      const q = input.value.trim().toLocaleLowerCase();
      const matches = players
        .filter(p => p.id !== window.__mjCurrentUserId)
        .filter(p => !q || p.username.toLocaleLowerCase().includes(q))
        .slice(0, 20);
      list.classList.remove('mj-hidden');
      input.setAttribute('aria-expanded', 'true');
      if (!matches.length) {
        list.innerHTML = `<div class="mj-autocomplete-empty">${esc(t('empty'))}</div>`;
        return;
      }
      list.innerHTML = matches.map(p => `<button type="button" class="mj-autocomplete-item" data-user-id="${esc(p.id)}"><span><strong>@${esc(p.username)}</strong>${p.display_name ? ` <small>${esc(p.display_name)}</small>` : ''}</span><span>${esc(t('invite'))}</span></button>`).join('');
      list.querySelectorAll('.mj-autocomplete-item').forEach(button => {
        button.onclick = () => sendInvite(campaignId, button.dataset.userId, input.value, detail, input, list);
      });
    };

    input.addEventListener('focus', render);
    input.addEventListener('input', render);
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        list.classList.add('mj-hidden');
        input.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('click', event => {
      if (!detail.contains(event.target)) {
        list.classList.add('mj-hidden');
        input.setAttribute('aria-expanded', 'false');
      }
    }, { once: false });
  }

  async function sendInvite(campaignId, userId, typedName, detail, input, list) {
    const player = players.find(p => p.id === userId);
    if (!player) return;
    const { data: member, error: memberError } = await db.from('campaign_members').select('id').eq('campaign_id', campaignId).eq('user_id', userId).eq('status', 'active').maybeSingle();
    if (memberError) return showError(memberError.message);
    if (member) return showError(getLang() === 'fr' ? 'Ce joueur fait déjà partie de la campagne.' : 'This player already belongs to the campaign.');
    const { data: pending, error: pendingError } = await db.from('campaign_invitations').select('id').eq('campaign_id', campaignId).eq('invited_user_id', userId).eq('status', 'pending').maybeSingle();
    if (pendingError) return showError(pendingError.message);
    if (pending) return showSuccess(getLang() === 'fr' ? `Invitation déjà envoyée à @${player.username}.` : `Invitation already sent to @${player.username}.`);
    const { data: sessionData } = await db.auth.getSession();
    const currentUser = sessionData.session?.user;
    if (!currentUser) return showError('Not authenticated');
    const { error } = await db.from('campaign_invitations').insert({ campaign_id: campaignId, invited_user_id: userId, invited_by: currentUser.id });
    if (error) return showError(error.message);
    input.value = '';
    list.classList.add('mj-hidden');
    input.setAttribute('aria-expanded', 'false');
    showSuccess(`${t('invited')}: @${player.username}`);
  }

  function showError(message) {
    const target = root.querySelector('#mj-msg');
    if (target) { target.textContent = message; target.className = 'status-message error'; }
  }
  function showSuccess(message) {
    const target = root.querySelector('#mj-msg');
    if (target) { target.textContent = message; target.className = 'status-message success'; }
  }

  async function intercept(event) {
    const button = event.target.closest('.mj-invite');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const session = await db.auth.getSession();
    window.__mjCurrentUserId = session.data.session?.user?.id || null;
    inviteUI(button.dataset.id);
  }

  root.addEventListener('click', intercept, true);
})();