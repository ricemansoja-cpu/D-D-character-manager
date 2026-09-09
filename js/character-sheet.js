const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

export async function loadCharacterSheet(supabase, characterId, userId) {
  const [{ data: character, error: characterError }, { data: scores, error: scoresError }] = await Promise.all([
    supabase.from('characters').select('*').eq('id', characterId).eq('user_id', userId).single(),
    supabase.from('character_ability_scores').select('*').eq('character_id', characterId).single()
  ]);
  if (characterError) throw characterError;
  if (scoresError) throw scoresError;
  return { character, scores };
}

export async function saveCharacterSheet(supabase, characterId, userId, values, scores) {
  const { error: characterError } = await supabase
    .from('characters')
    .update({
      name: values.name.trim(),
      level: Number(values.level),
      experience: Number(values.experience),
      hp_max: Number(values.hpMax),
      hp_current: Number(values.hpCurrent),
      hp_temporary: Number(values.hpTemporary),
      armor_class: Number(values.armorClass),
      speed: Number(values.speed),
      hit_dice: values.hitDice.trim(),
      inspiration_heroic: values.inspirationHeroic
    })
    .eq('id', characterId)
    .eq('user_id', userId);
  if (characterError) throw characterError;

  const scorePayload = { character_id: characterId };
  ABILITIES.forEach((ability) => { scorePayload[ability] = Number(scores[ability]); });
  const { error: scoreError } = await supabase
    .from('character_ability_scores')
    .update(scorePayload)
    .eq('character_id', characterId);
  if (scoreError) throw scoreError;
}

export { ABILITIES };
