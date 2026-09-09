export const SPELL_LEVELS = [0,1,2,3,4,5,6,7,8,9];

export async function loadSpellbook(supabase, characterId, userId) {
  const characterResult = await supabase.from('characters').select('id,user_id,spellcasting_ability_key').eq('id', characterId).eq('user_id', userId).single();
  if (characterResult.error) throw characterResult.error;
  const [spellsResult, castingResult] = await Promise.all([
    supabase.from('character_spells').select('*').eq('character_id', characterId).order('level').order('sort_order'),
    supabase.from('character_spellcasting').select('*').eq('character_id', characterId).maybeSingle()
  ]);
  if (spellsResult.error) throw spellsResult.error;
  if (castingResult.error) throw castingResult.error;
  return { spells: spellsResult.data || [], spellcasting: castingResult.data || { ability_key: characterResult.data.spellcasting_ability_key || null } };
}

export async function saveSpellbook(supabase, characterId, userId, abilityKey, spells) {
  const characterUpdate = await supabase.from('characters').update({ spellcasting_ability_key: abilityKey || null }).eq('id', characterId).eq('user_id', userId);
  if (characterUpdate.error) throw characterUpdate.error;
  const castingUpdate = await supabase.from('character_spellcasting').upsert({ character_id: characterId, ability_key: abilityKey || null }, { onConflict: 'character_id' });
  if (castingUpdate.error) throw castingUpdate.error;
  const deletion = await supabase.from('character_spells').delete().eq('character_id', characterId);
  if (deletion.error) throw deletion.error;
  const rows = spells.filter(s => s.spellName?.trim()).map((s, index) => ({
    character_id: characterId,
    spell_id: s.spellId || null,
    spell_name: s.spellName.trim(),
    level: Number(s.level),
    prepared: Boolean(s.prepared),
    notes: s.notes?.trim() || '',
    sort_order: index
  }));
  if (rows.length) {
    const insertion = await supabase.from('character_spells').insert(rows);
    if (insertion.error) throw insertion.error;
  }
}
