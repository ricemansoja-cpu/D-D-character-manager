(() => {
  const client = window.supabase.createClient('https://wmeuebjbvoqudhpwtxyn.supabase.co', 'sb_publishable_jYrKnt_Unuv5M6XT1t0AaQ_quQTOpCD');
  const defs = (classKey, level, chaMod = 0) => {
    const l = Number(level || 1);
    const d = {
      barbarian: [{ key: 'rage', label: 'Rage', max: l >= 12 ? 5 : l >= 6 ? 4 : l >= 3 ? 3 : 2, recovery: 'short_rest' }],
      bard: [{ key: 'bardic_inspiration', label: 'Bardic Inspiration', max: Math.max(1, chaMod), recovery: l >= 5 ? 'short_rest' : 'long_rest' }],
      cleric: l >= 2 ? [{ key: 'channel_divinity', label: 'Channel Divinity', max: l >= 9 ? 4 : l >= 5 ? 3 : 2, recovery: 'short_rest' }] : [],
      druid: l >= 2 ? [{ key: 'wild_shape', label: 'Wild Shape', max: l >= 17 ? 6 : l >= 6 ? 3 : 2, recovery: 'short_rest' }] : [],
      fighter: [{ key: 'second_wind', label: 'Second Wind', max: l >= 10 ? 4 : l >= 4 ? 3 : 2, recovery: 'short_rest' }, ...(l >= 2 ? [{ key: 'action_surge', label: 'Action Surge', max: l >= 17 ? 2 : 1, recovery: 'short_rest' }] : [])],
      monk: l >= 2 ? [{ key: 'focus_points', label: 'Focus Points', max: l, recovery: 'short_rest' }] : [],
      paladin: [{ key: 'lay_on_hands', label: 'Lay On Hands', max: 5 * l, recovery: 'long_rest' }, ...(l >= 3 ? [{ key: 'channel_divinity', label: 'Channel Divinity', max: l >= 11 ? 3 : 2, recovery: 'short_rest' }] : [])],
      sorcerer: [{ key: 'innate_sorcery', label: 'Innate Sorcery', max: 2, recovery: 'long_rest' }, ...(l >= 2 ? [{ key: 'sorcery_points', label: 'Sorcery Points', max: l, recovery: 'long_rest' }] : [])]
    };
    return d[classKey] || [];
  };
  const mod = score => Math.floor((Number(score || 10) - 10) / 2);
  const label = key => ({ rage: 'Rage', bardic_inspiration: 'Bardic Inspiration', channel_divinity: 'Channel Divinity', wild_shape: 'Wild Shape', second_wind: 'Second Wind', action_surge: 'Action Surge', focus_points: 'Focus Points', lay_on_hands: 'Lay On Hands', innate_sorcery: 'Innate Sorcery', sorcery_points: 'Sorcery Points' })[key] || key;
  const recovery = value => value === 'short_rest' ? 'Short Rest' : 'Long Rest';

  async function character() {
    const name = document.querySelector('#sheet-name')?.value?.trim();
    if (!name) return null;
    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;
    const { data, error } = await client.from('characters').select('id,class_key,level').eq('user_id', user.id).eq('name', name).maybeSingle();
    if (error) throw error;
    return data;
  }
  async function render(characterId) {
    const panel = document.querySelector('#resources-panel');
    const list = document.querySelector('#resources-list');
    if (!panel || !list) return;
    const { data, error } = await client.from('character_resources').select('*').eq('character_id', characterId).order('resource_key');
    if (error) throw error;
    panel.classList.toggle('hidden', !data?.length);
    list.innerHTML = (data || []).map(r => `<div class="resource-card"><div><strong>${label(r.resource_key)}</strong><small>${recovery(r.recovery)}</small></div><div class="resource-controls"><button type="button" class="button button-secondary resource-minus" data-id="${r.id}" ${r.current_uses <= 0 ? 'disabled' : ''}>−</button><span>${r.current_uses} / ${r.max_uses}</span><button type="button" class="button button-secondary resource-plus" data-id="${r.id}" ${r.current_uses >= r.max_uses ? 'disabled' : ''}>+</button></div></div>`).join('');
  }
  async function sync(characterData) {
    if (!characterData) return;
    const cha = mod(document.querySelector('#score-charisma')?.value || 10);
    const wanted = defs(characterData.class_key, characterData.level, cha);
    const { data: existing } = await client.from('character_resources').select('*').eq('character_id', characterData.id);
    for (const d of wanted) {
      const row = (existing || []).find(x => x.resource_key === d.key);
      if (!row) await client.from('character_resources').insert({ character_id: characterData.id, resource_key: d.key, current_uses: d.max, max_uses: d.max, recovery: d.recovery });
      else if (row.max_uses !== d.max || row.recovery !== d.recovery) await client.from('character_resources').update({ max_uses: d.max, current_uses: Math.min(d.max, row.current_uses + Math.max(0, d.max - row.max_uses)), recovery: d.recovery }).eq('id', row.id);
    }
    await render(characterData.id);
  }
  async function change(id, delta) {
    const { data } = await client.from('character_resources').select('current_uses,max_uses').eq('id', id).single();
    if (!data) return;
    await client.from('character_resources').update({ current_uses: Math.max(0, Math.min(data.max_uses, data.current_uses + delta)) }).eq('id', id);
    const c = await character(); if (c) await render(c.id);
  }
  window.refreshCharacterResources = sync;
  window.restoreCharacterResources = async (characterId, restType) => {
    const { data } = await client.from('character_resources').select('id,max_uses,recovery').eq('character_id', characterId);
    for (const r of data || []) if (restType === 'long' || r.recovery === 'short_rest') await client.from('character_resources').update({ current_uses: r.max_uses }).eq('id', r.id);
    await render(characterId);
  };
  document.addEventListener('click', event => { const minus = event.target.closest('.resource-minus'); const plus = event.target.closest('.resource-plus'); if (minus) change(minus.dataset.id, -1); if (plus) change(plus.dataset.id, 1); });
  window.addEventListener('character-rest-applied', async event => { const c = await character(); if (c) await window.restoreCharacterResources(c.id, event.detail?.restType || 'long'); });
  const observer = new MutationObserver(async () => { const modal = document.querySelector('#sheet-modal'); if (!modal || modal.classList.contains('hidden')) return; const c = await character(); if (c) await sync(c); });
  observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
  document.addEventListener('change', async event => { if (!['sheet-level', 'score-charisma'].includes(event.target.id)) return; const c = await character(); if (c) await sync(c); });
})();
