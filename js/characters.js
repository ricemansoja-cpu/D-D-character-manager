const CLASSES = [
  ['barbarian', 'Barbarian'], ['bard', 'Bard'], ['cleric', 'Cleric'], ['druid', 'Druid'],
  ['fighter', 'Fighter'], ['monk', 'Monk'], ['paladin', 'Paladin'], ['ranger', 'Ranger'],
  ['rogue', 'Rogue'], ['sorcerer', 'Sorcerer'], ['warlock', 'Warlock'], ['wizard', 'Wizard']
];

const SPECIES = [
  ['aasimar', 'Aasimar'], ['dragonborn', 'Dragonborn'], ['dwarf', 'Dwarf'], ['elf', 'Elf'],
  ['gnome', 'Gnome'], ['goliath', 'Goliath'], ['halfling', 'Halfling'], ['human', 'Human'],
  ['orc', 'Orc'], ['tiefling', 'Tiefling']
];

const BACKGROUNDS = [
  ['acolyte', 'Acolyte'], ['artisan', 'Artisan'], ['charlatan', 'Charlatan'], ['criminal', 'Criminal'],
  ['entertainer', 'Entertainer'], ['guard', 'Guard'], ['farmer', 'Farmer'], ['guide', 'Guide'],
  ['hermit', 'Hermit'], ['noble', 'Noble'], ['merchant', 'Merchant'], ['sage', 'Sage'],
  ['sailor', 'Sailor'], ['soldier', 'Soldier'], ['scribe', 'Scribe'], ['wayfarer', 'Wayfarer']
];

export async function loadCharacters(supabase, userId) {
  const { data, error } = await supabase
    .from('characters')
    .select('id, name, level, class_key, subclass_key, species_key, background_key, hp_current, hp_max, armor_class, speed, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createCharacter(supabase, userId, values) {
  const { data: character, error } = await supabase
    .from('characters')
    .insert({
      user_id: userId,
      name: values.name.trim(),
      level: 1,
      class_key: values.classKey,
      species_key: values.speciesKey,
      background_key: values.backgroundKey,
      hp_max: 10,
      hp_current: 10,
      armor_class: 10,
      speed: 30,
      hit_dice: '1d10'
    })
    .select('id')
    .single();
  if (error) throw error;

  const characterId = character.id;
  const writes = await Promise.all([
    supabase.from('character_ability_scores').insert({ character_id: characterId }),
    supabase.from('character_skills').insert({ character_id: characterId }),
    supabase.from('character_saving_throws').insert({ character_id: characterId }),
    supabase.from('character_currency').insert({ character_id: characterId }),
    supabase.from('character_spell_slots').insert({ character_id: characterId })
  ]);

  const childError = writes.find(({ error: writeError }) => writeError)?.error;
  if (childError) {
    await supabase.from('characters').delete().eq('id', characterId).eq('user_id', userId);
    throw childError;
  }

  return characterId;
}

export function getDndOptions() {
  return { classes: CLASSES, species: SPECIES, backgrounds: BACKGROUNDS };
}
