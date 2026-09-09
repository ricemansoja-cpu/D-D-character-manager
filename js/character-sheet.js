const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

const SKILLS = [
  ['acrobatics', 'dexterity'], ['animal_handling', 'wisdom'], ['arcana', 'intelligence'],
  ['athletics', 'strength'], ['deception', 'charisma'], ['history', 'intelligence'],
  ['insight', 'wisdom'], ['intimidation', 'charisma'], ['investigation', 'intelligence'],
  ['medicine', 'wisdom'], ['nature', 'intelligence'], ['perception', 'wisdom'],
  ['performance', 'charisma'], ['persuasion', 'charisma'], ['religion', 'intelligence'],
  ['sleight_of_hand', 'dexterity'], ['stealth', 'dexterity'], ['survival', 'wisdom']
];

export async function loadCharacterSheet(supabase, characterId, userId) {
  const [characterResult, scoresResult, skillsResult, savesResult, attacksResult] = await Promise.all([
    supabase.from('characters').select('*').eq('id', characterId).eq('user_id', userId).single(),
    supabase.from('character_ability_scores').select('*').eq('character_id', characterId).single(),
    supabase.from('character_skills').select('*').eq('character_id', characterId).single(),
    supabase.from('character_saving_throws').select('*').eq('character_id', characterId).single(),
    supabase.from('character_attacks').select('*').eq('character_id', characterId).order('sort_order', { ascending: true })
  ]);
  if (characterResult.error) throw characterResult.error;
  if (scoresResult.error) throw scoresResult.error;
  if (skillsResult.error) throw skillsResult.error;
  if (savesResult.error) throw savesResult.error;
  if (attacksResult.error) throw attacksResult.error;
  return { character: characterResult.data, scores: scoresResult.data, skills: skillsResult.data, savingThrows: savesResult.data, attacks: attacksResult.data || [] };
}

export async function saveCharacterSheet(supabase, characterId, userId, values, scores, skills, savingThrows, attacks) {
  const { error: characterError } = await supabase.from('characters').update({
    name: values.name.trim(), level: Number(values.level), experience: Number(values.experience),
    hp_max: Number(values.hpMax), hp_current: Number(values.hpCurrent), hp_temporary: Number(values.hpTemporary),
    armor_class: Number(values.armorClass), speed: Number(values.speed), hit_dice: values.hitDice.trim(),
    death_save_successes: Number(values.deathSaveSuccesses || 0), death_save_failures: Number(values.deathSaveFailures || 0),
    inspiration_heroic: Boolean(values.inspirationHeroic)
  }).eq('id', characterId).eq('user_id', userId);
  if (characterError) throw characterError;

  const scorePayload = { character_id: characterId };
  ABILITIES.forEach((ability) => { scorePayload[ability] = Number(scores[ability]); });
  const { error: scoreError } = await supabase.from('character_ability_scores').update(scorePayload).eq('character_id', characterId);
  if (scoreError) throw scoreError;

  const skillPayload = { character_id: characterId };
  SKILLS.forEach(([skill]) => { skillPayload[skill] = Boolean(skills[skill]); });
  const { error: skillError } = await supabase.from('character_skills').update(skillPayload).eq('character_id', characterId);
  if (skillError) throw skillError;

  const savePayload = { character_id: characterId };
  ABILITIES.forEach((ability) => { savePayload[ability] = Boolean(savingThrows[ability]); });
  const { error: saveError } = await supabase.from('character_saving_throws').update(savePayload).eq('character_id', characterId);
  if (saveError) throw saveError;

  const { error: deleteAttacksError } = await supabase.from('character_attacks').delete().eq('character_id', characterId);
  if (deleteAttacksError) throw deleteAttacksError;
  const attackRows = attacks.filter((attack) => attack.name?.trim()).map((attack, index) => ({
    character_id: characterId, name: attack.name.trim(), attack_bonus: attack.attackBonus?.trim() || '',
    damage: attack.damage?.trim() || '', notes: attack.notes?.trim() || '', sort_order: index
  }));
  if (attackRows.length) {
    const { error: attacksError } = await supabase.from('character_attacks').insert(attackRows);
    if (attacksError) throw attacksError;
  }
}

export { ABILITIES, SKILLS };
