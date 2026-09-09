(() => {
  const client = window.supabase.createClient('https://wmeuebjbvoqudhpwtxyn.supabase.co', 'sb_publishable_jYrKnt_Unuv5M6XT1t0AaQ_quQTOpCD');
  const defs = (classKey, level, chaMod = 0) => {
    const l = Number(level || 1);
    const d = {
      barbarian: [{ key: 'rage', label: 'Rage', max: l >= 17 ? 6 : l >= 12 ? 5 : l >= 6 ? 4 : l >= 3 ? 3 : 2, short: 1, long: 'all' }],
      bard: [{ key: 'bardic_inspiration', label: 'Bardic Inspiration', max: Math.max(1, chaMod), short: l >= 5 ? 'all' : 0, long: 'all' }],
      cleric: l >= 2 ? [{ key: 'channel_divinity', label: 'Channel Divinity', max: l >= 9 ? 4 : l >= 5 ? 3 : 2, short: 1, long: 'all' }] : [],
      druid: l >= 2 ? [{ key: 'wild_shape', label: 'Wild Shape', max: l >= 17 ? 6 : l >= 6 ? 3 : 2, short: 1, long: 'all' }] : [],
      fighter: [{ key: 'second_wind', label: 'Second Wind', max: l >= 10 ? 4 : l >= 4 ? 3 : 2, short: 1, long: 'all' }, ...(l >= 2 ? [{ key: 'action_surge', label: 'Action Surge', max: l >= 17 ? 2 : 1, short: 1, long: 'all' }] : [])],
      monk: l >= 2 ? [{ key: 'focus_points', label: 'Focus Points', max: l, short: 'all', long: 'all' }] : [],
      paladin: [{ key: 'lay_on_hands', label: 'Lay On Hands', max: 5 * l, short: 0, long: 'all', pool: true }, ...(l >= 3 ? [{ key: 'channel_divinity', label: 'Channel Divinity', max: l >= 11 ? 3 : 2, short: 1, long: 'all' }] : [])],
      ranger: [{ key: 'favored_enemy', label: 'Favored Enemy', max: l >= 17 ? 6 : l >= 13 ? 5 : l >= 9 ? 4 : l >= 5 ? 3 : 2, short: 0, long: 'all' }],
      sorcerer: [{ key: 'innate_sorcery', label: 'Innate Sorcery', max: 2, short: 0, long: 'all' }, ...(l >= 2 ? [{ key: 'sorcery_points', label: 'Sorcery Points', max: l, short: 0, long: 'all', pool: true }] : [])],
      warlock: l >= 2 ? [{ key: 'magical_cunning', label: 'Magical Cunning', max: 1, short: 0, long: 'all' }] : []
    };
    return d[classKey] || [];
  };
  const mod = score => Math.floor((Number(score || 10) - 10) / 2);
  const labels = { rage: 'Rage', bardic_inspiration: 'Bardic Inspiration', channel_divinity: 'Channel Divinity', wild_shape: 'Wild Shape', second_wind: 'Second Wind', action_surge: 'Action Surge', focus_points: 'Focus Points', lay_on_hands: 'Lay On Hands', favored_enemy: 'Favored Enemy', innate_sorcery: 'Innate Sorcery', sorcery_points: 'Sorcery Points', magical_cunning: 'Magical Cunning' };
  const label = key => labels[key] || key;
  const recovery = r => r.short_rest_restore === null ? 'Short Rest: all' : Number(r.short_rest_restore) > 0 ? `Short Rest: +${r.short_rest_restore}` : 'Long Rest: all';
  async function character() {
    const name = document.querySelector('#sheet-name')?.value?.trim(); if (!name) return null;
    const { data: { user } } = await client.auth.getUser(); if (!user) return null;
    const { data, error } = await client.from('characters').select('id,class_key,level').eq('user_id', user.id).eq('name', name).maybeSingle(); if (error) throw error; return data;
  }
  async function render(characterId) {
    const panel = document.querySelector('#resources-panel'), list = document.querySelector('#resources-list'); if (!panel || !list) return;
    const { data, error } = await client.from('character_resources').select('*').eq('character_id', characterId).order('resource_key'); if (error) throw error;
    panel.classList.toggle('hidden', !data?.length);
    list.innerHTML = (data || []).map(r => `<div class="resource-card"><div><strong>${label(r.resource_key)}</strong><small>${recovery(r)}</small></div><div class="resource-controls"><button type="button" class="button button-secondary resource-minus" data-id="${r.id}" ${r.current_uses <= 0 ? 'disabled' : ''}>−</button><span>${r.current_uses} / ${r.max_uses}</span><button type="button" class="button button-secondary resource-plus" data-id="${r.id}" ${r.current_uses >= r.max_uses ? 'disabled' : ''}>+</button></div></div>`).join('');
  }
  async function sync(characterData) {
    if (!characterData) return;
    const cha = mod(document.querySelector('#score-charisma')?.value || 10);
    const wanted = defs(characterData.class_key, characterData.level, cha);
    const { data: existing, error } = await client.from('character_resources').select('*').eq('character_id', characterData.id); if (error) throw error;
    for (const d of wanted) {
      const row = (existing || []).find(x => x.resource_key === d.key);
      const patch = { max_uses: d.max, recovery: d.short === 'all' ? 'short_rest_all' : d.short > 0 ? 'short_rest_one' : 'long_rest', short_rest_restore: d.short === 'all' ? null : Number(d.short || 0), long_rest_restore: d.long };
      if (!row) await client.from('character_resources').insert({ character_id: characterData.id, resource_key: d.key, current_uses: d.max, ...patch });
      else if (row.max_uses !== d.max || row.recovery !== patch.recovery || row.short_rest_restore !== patch.short_rest_restore) await client.from('character_resources').update({ ...patch, current_uses: Math.min(d.max, row.current_uses + Math.max(0, d.max - row.max_uses)) }).eq('id', row.id);
    }
    await render(characterData.id);
  }
  async function change(id, delta) {
    const { data } = await client.from('character_resources').select('current_uses,max_uses').eq('id', id).single(); if (!data) return;
    await client.from('character_resources').update({ current_uses: Math.max(0, Math.min(data.max_uses, data.current_uses + delta)) }).eq('id', id);
    const c = await character(); if (c) await render(c.id);
  }
  window.refreshCharacterResources = sync;
  window.restoreCharacterResources = async (characterId, restType) => {
    const { data, error } = await client.from('character_resources').select('id,current_uses,max_uses,short_rest_restore,long_rest_restore').eq('character_id', characterId); if (error) throw error;
    for (const r of data || []) {
      const restore = restType === 'long' ? r.max_uses : r.short_rest_restore === null ? r.max_uses : Number(r.short_rest_restore || 0);
      if (restore > 0) await client.from('character_resources').update({ current_uses: Math.min(r.max_uses, r.current_uses + restore) }).eq('id', r.id);
    }
    await render(characterId);
  };
  document.addEventListener('click', event => { const minus = event.target.closest('.resource-minus'), plus = event.target.closest('.resource-plus'); if (minus) change(minus.dataset.id, -1); if (plus) change(plus.dataset.id, 1); });
  window.addEventListener('character-rest-applied', async event => { const c = await character(); if (c) await window.restoreCharacterResources(c.id, event.detail?.restType || 'long'); });
  let sheetOpen = false;
  const observer = new MutationObserver(async () => { const modal = document.querySelector('#sheet-modal'); if (!modal) return; const open = !modal.classList.contains('hidden'); if (open && !sheetOpen) { sheetOpen = true; const c = await character(); if (c) await sync(c); } if (!open) sheetOpen = false; });
  observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
  document.addEventListener('change', async event => { if (!['sheet-level', 'score-charisma'].includes(event.target.id)) return; const c = await character(); if (c) await sync(c); });
})();