export const SPELL_LEVELS = [0,1,2,3,4,5,6,7,8,9];

const SPELL_PROFILES = {
  bard: { cantrips:[2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4], prepared:[4,5,6,7,9,10,10,11,12,14,15,15,16,18,19,19,20,22,22,22] },
  cleric: { cantrips:[3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5], prepared:[4,5,6,7,9,10,10,11,12,14,15,15,16,18,19,19,20,22,22,22] },
  druid: { cantrips:[2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4], prepared:[4,5,6,7,9,10,10,11,12,14,15,15,16,18,19,19,20,22,22,22] },
  sorcerer: { cantrips:[4,4,4,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6], prepared:[2,4,6,7,9,10,11,12,14,15,16,16,17,18,19,21,22,23,24,25] },
  wizard: { cantrips:[3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5], prepared:[4,5,6,7,9,10,11,12,14,15,16,16,17,18,19,21,22,23,24,25], spellbook:[6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44] },
  paladin: { cantrips:Array(20).fill(0), prepared:[2,3,4,5,6,6,7,7,9,9,10,10,11,11,12,12,14,14,15,15] },
  ranger: { cantrips:Array(20).fill(0), prepared:[2,3,4,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13] },
  warlock: { cantrips:[2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4], prepared:[2,3,4,5,6,7,8,9,10,10,11,11,12,12,13,13,14,14,15,15] }
};

function getProfile(classKey, level) {
  const profile = SPELL_PROFILES[classKey];
  if (!profile) return null;
  const index = Math.max(1, Math.min(20, Number(level) || 1)) - 1;
  return { ...profile, level:index + 1, cantripLimit:profile.cantrips?.[index] ?? 0, preparedLimit:profile.prepared?.[index] ?? 0, spellbookLimit:profile.spellbook?.[index] ?? null };
}

export function getSpellcastingProfile(classKey, level) { return getProfile(classKey, level); }

export async function loadSpellbook(supabase, characterId, userId) {
  const characterResult = await supabase.from('characters').select('id,user_id,class_key,level,spellcasting_ability_key').eq('id', characterId).eq('user_id', userId).single();
  if (characterResult.error) throw characterResult.error;
  const [spellsResult, castingResult] = await Promise.all([
    supabase.from('character_spells').select('*').eq('character_id', characterId).order('level').order('sort_order'),
    supabase.from('character_spellcasting').select('*').eq('character_id', characterId).maybeSingle()
  ]);
  if (spellsResult.error) throw spellsResult.error;
  if (castingResult.error) throw castingResult.error;
  const character = characterResult.data;
  return { spells:spellsResult.data || [], spellcasting:castingResult.data || { ability_key:character.spellcasting_ability_key || null }, profile:getProfile(character.class_key, character.level), classKey:character.class_key, level:character.level };
}

export async function saveSpellbook(supabase, characterId, userId, abilityKey, spells) {
  const characterResult = await supabase.from('characters').select('class_key,level').eq('id', characterId).eq('user_id', userId).single();
  if (characterResult.error) throw characterResult.error;
  const profile = getProfile(characterResult.data.class_key, characterResult.data.level);
  const normalized = spells.filter(s => s.spellName?.trim()).map((s,index) => ({ ...s, spellName:s.spellName.trim(), level:Number(s.level), prepared:Boolean(s.prepared), notes:s.notes?.trim() || '', sortOrder:index }));
  const cantrips = normalized.filter(s => s.level === 0).length;
  const prepared = normalized.filter(s => s.level > 0 && s.prepared).length;
  const totalLevelled = normalized.filter(s => s.level > 0).length;
  if (profile && cantrips > profile.cantripLimit) throw new Error(`Too many cantrips: ${cantrips}/${profile.cantripLimit}.`);
  if (profile && prepared > profile.preparedLimit) throw new Error(`Too many prepared spells: ${prepared}/${profile.preparedLimit}.`);
  if (profile?.spellbookLimit && totalLevelled > profile.spellbookLimit) throw new Error(`Too many spells in spellbook: ${totalLevelled}/${profile.spellbookLimit}.`);
  const characterUpdate = await supabase.from('characters').update({ spellcasting_ability_key:abilityKey || null }).eq('id',characterId).eq('user_id',userId);
  if (characterUpdate.error) throw characterUpdate.error;
  const castingUpdate = await supabase.from('character_spellcasting').upsert({ character_id:characterId, ability_key:abilityKey || null }, { onConflict:'character_id' });
  if (castingUpdate.error) throw castingUpdate.error;
  const deletion = await supabase.from('character_spells').delete().eq('character_id',characterId);
  if (deletion.error) throw deletion.error;
  const rows = normalized.map((s,index) => ({ character_id:characterId, spell_id:s.spellId || null, spell_name:s.spellName, level:s.level, prepared:s.prepared, notes:s.notes, sort_order:index }));
  if (rows.length) {
    const insertion = await supabase.from('character_spells').insert(rows);
    if (insertion.error) throw insertion.error;
  }
}

function currentLanguage() { return localStorage.getItem('preferredLanguage') || 'en'; }

function renderSpellLimits(profile) {
  const list = document.querySelector('#spells-list');
  if (!list || !profile) return;
  let summary = document.querySelector('#spell-limits-summary');
  if (!summary) { summary=document.createElement('div'); summary.id='spell-limits-summary'; list.parentElement?.insertBefore(summary,list); }
  const lang=currentLanguage();
  const cantripText=lang==='fr'?'Tours de magie':'Cantrips';
  const preparedText=lang==='fr'?'Sorts préparés':'Prepared spells';
  const bookText=lang==='fr'?'Livre de sorts':'Spellbook';
  summary.className='spell-limits-summary';
  summary.innerHTML=`<span><strong>${cantripText}</strong> ${profile.cantripLimit}</span><span><strong>${preparedText}</strong> ${profile.preparedLimit}</span>${profile.spellbookLimit ? `<span><strong>${bookText}</strong> ${profile.spellbookLimit}</span>` : ''}`;
  updateSpellLimitStatus();
}

function updateSpellLimitStatus() {
  const summary=document.querySelector('#spell-limits-summary');
  const list=document.querySelector('#spells-list');
  const profile=window.__dndSpellProfile;
  if (!summary || !list || !profile) return;
  const rows=[...list.querySelectorAll('.spell-row')];
  const cantrips=rows.filter(row=>Number(row.querySelector('.spell-level')?.value)===0 && row.querySelector('.spell-name')?.value.trim()).length;
  const prepared=rows.filter(row=>Number(row.querySelector('.spell-level')?.value)>0 && row.querySelector('.spell-name')?.value.trim() && row.querySelector('.spell-prepared input')?.checked).length;
  const over=cantrips>profile.cantripLimit || prepared>profile.preparedLimit;
  summary.dataset.invalid=over?'true':'false';
  summary.innerHTML += `<span class="spell-limit-current ${over?'invalid':''}">${currentLanguage()==='fr' ? `Actuels : ${cantrips} tours, ${prepared} préparés` : `Current: ${cantrips} cantrips, ${prepared} prepared`}</span>`;
}

window.__dndSpellProfile=null;
window.__renderDndSpellLimits=renderSpellLimits;

document.addEventListener('input',event=>{ if(event.target.closest('#spells-list')) updateSpellLimitStatus(); });
document.addEventListener('change',event=>{ if(event.target.closest('#spells-list')) updateSpellLimitStatus(); });
document.addEventListener('click',event=>{ if(event.target.matches('#add-spell-button')) setTimeout(updateSpellLimitStatus,0); });

let lastProfileKey='';
const spellObserver=new MutationObserver(async()=>{
  const modal=document.querySelector('#sheet-modal');
  const name=document.querySelector('#sheet-name')?.value?.trim();
  const level=Number(document.querySelector('#sheet-level')?.value || 1);
  if(!modal || modal.classList.contains('hidden') || !name) return;
  const key=`${name}:${level}`;
  if(key===lastProfileKey) return;
  try {
    const {createClient}=window.supabase;
    const client=createClient('https://wmeuebjbvoqudhpwtxyn.supabase.co','sb_publishable_jYrKnt_Unuv5M6XT1t0AaQ_quQTOpCD');
    const {data:{user}}=await client.auth.getUser();
    if(!user) return;
    const {data}=await client.from('characters').select('class_key,level').eq('user_id',user.id).eq('name',name).maybeSingle();
    if(!data) return;
    const profile=getProfile(data.class_key,Number(data.level || level));
    window.__dndSpellProfile=profile;
    lastProfileKey=key;
    renderSpellLimits(profile);
  } catch (_) {}
});
spellObserver.observe(document.body,{childList:true,subtree:true});
