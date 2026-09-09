const ATTACK_SUPABASE_URL = 'https://wmeuebjbvoqudhpwtxyn.supabase.co';
const ATTACK_SUPABASE_KEY = 'sb_publishable_jYrKnt_Unuv5M6XT1t0AaQ_quQTOpCD';
const { createClient: createAttackClient } = window.supabase;
const attackSupabase = createAttackClient(ATTACK_SUPABASE_URL, ATTACK_SUPABASE_KEY);
let activeCharacterId = null;

const SIMPLE_AND_MARTIAL = new Set(['barbarian','fighter','paladin','ranger','rogue']);
const SIMPLE_ONLY = new Set(['bard','cleric','druid','sorcerer','warlock','wizard']);
const RANGED_WEAPONS = new Set(['Blowgun','Crossbow, Hand','Crossbow, Heavy','Crossbow, Light','Longbow','Shortbow','Sling','Dart']);
const modifier = score => Math.floor((Number(score ?? 10) - 10) / 2);
const proficiencyBonus = level => 2 + Math.floor((Math.max(1, Number(level ?? 1)) - 1) / 4);

function weaponProficient(classKey, item) {
  if (SIMPLE_AND_MARTIAL.has(classKey)) return true;
  if (SIMPLE_ONLY.has(classKey)) return item.properties?.category === undefined || String(item.properties?.category).toLowerCase() === 'simple';
  return false;
}

function calculateWeaponAttack(character, scores, item) {
  const properties = String(item.properties?.properties || '');
  const damage = String(item.properties?.damage || '');
  const finesse = /\bFinesse\b/i.test(properties);
  const ranged = RANGED_WEAPONS.has(item.name) || /\bAmmunition\b/i.test(properties);
  const str = modifier(scores.strength);
  const dex = modifier(scores.dexterity);
  const ability = finesse ? (dex > str ? 'DEX' : 'STR') : (ranged ? 'DEX' : 'STR');
  const abilityMod = ability === 'DEX' ? dex : str;
  const proficient = weaponProficient(character.class_key, item);
  const bonus = abilityMod + (proficient ? proficiencyBonus(character.level) : 0);
  const damageText = `${damage}${abilityMod >= 0 ? ` + ${abilityMod}` : ` - ${Math.abs(abilityMod)}`}`;
  const notes = [ranged ? 'Ranged' : 'Melee', finesse ? `Finesse (${ability})` : '', properties, item.properties?.mastery ? `Mastery: ${item.properties.mastery}` : '', proficient ? '' : 'Not proficient'].filter(Boolean).join(' · ');
  return { attack_bonus: `${bonus >= 0 ? '+' : ''}${bonus}`, damage: damageText, notes };
}

async function addAttackForRow(row) {
  if (!activeCharacterId) return;
  const name = row.querySelector('.inventory-main strong')?.textContent?.trim();
  if (!name) return;
  const [{ data: item, error: itemError }, { data: character, error: characterError }, { data: scores, error: scoresError }] = await Promise.all([
    attackSupabase.from('equipment_catalog').select('*').eq('name', name).eq('category', 'weapon').maybeSingle(),
    attackSupabase.from('characters').select('id,class_key,level').eq('id', activeCharacterId).single(),
    attackSupabase.from('character_ability_scores').select('*').eq('character_id', activeCharacterId).single()
  ]);
  if (itemError || characterError || scoresError || !item) return;
  const attack = calculateWeaponAttack(character, scores, item);
  const { data: existing } = await attackSupabase.from('character_attacks').select('id').eq('character_id', activeCharacterId).eq('name', item.name).maybeSingle();
  if (existing) {
    await attackSupabase.from('character_attacks').update({ attack_bonus: attack.attack_bonus, damage: attack.damage, notes: attack.notes }).eq('id', existing.id);
  } else {
    await attackSupabase.from('character_attacks').insert({ character_id: activeCharacterId, name: item.name, attack_bonus: attack.attack_bonus, damage: attack.damage, notes: attack.notes, sort_order: Date.now() });
  }
  const message = document.querySelector('#equipment-message');
  if (message) { message.textContent = localStorage.getItem('preferredLanguage') === 'fr' ? 'Attaque calculée et ajoutée à la fiche.' : 'Attack calculated and added to the character sheet.'; message.className = 'status-message success'; }
}

function injectAttackButtons() {
  const modal = document.querySelector('#equipment-modal');
  const inventory = document.querySelector('#equipment-inventory');
  if (!modal || !inventory || modal.classList.contains('hidden') || !activeCharacterId) return;
  inventory.querySelectorAll('.inventory-row').forEach(row => {
    if (row.querySelector('.inventory-attack-sync')) return;
    const name = row.querySelector('.inventory-main strong')?.textContent?.trim();
    const equipped = row.querySelector('.inventory-equip')?.checked;
    if (!equipped || !name) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'icon-button inventory-attack-sync'; button.title = 'Calculate attack'; button.textContent = '⚔';
    button.addEventListener('click', () => addAttackForRow(row));
    const saveButton = row.querySelector('.inventory-save');
    if (saveButton) saveButton.insertAdjacentElement('beforebegin', button);
  });
}

document.addEventListener('click', event => {
  const button = event.target.closest('.equipment-open-button');
  if (button?.dataset.characterId) activeCharacterId = button.dataset.characterId;
});
const observer = new MutationObserver(injectAttackButtons);
observer.observe(document.body, { childList: true, subtree: true });
setInterval(injectAttackButtons, 500);
