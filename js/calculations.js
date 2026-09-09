const ABILITIES = ['strength','dexterity','constitution','intelligence','wisdom','charisma'];
const SKILLS = [
  ['acrobatics','dexterity'],['animal_handling','wisdom'],['arcana','intelligence'],['athletics','strength'],
  ['deception','charisma'],['history','intelligence'],['insight','wisdom'],['intimidation','charisma'],
  ['investigation','intelligence'],['medicine','wisdom'],['nature','intelligence'],['perception','wisdom'],
  ['performance','charisma'],['persuasion','charisma'],['religion','intelligence'],['sleight_of_hand','dexterity'],
  ['stealth','dexterity'],['survival','wisdom']
];

export function abilityModifier(score) { return Math.floor((Number(score) - 10) / 2); }
export function proficiencyBonus(level) { return 2 + Math.floor((Math.max(1, Number(level)) - 1) / 4); }
export function formatModifier(value) { return value >= 0 ? `+${value}` : `${value}`; }
export function calculateDerived(scores, level, skills = {}, saves = {}, spellcastingAbility = '') {
  const pb = proficiencyBonus(level);
  const modifiers = Object.fromEntries(ABILITIES.map(a => [a, abilityModifier(scores[a] ?? 10)]));
  const skillBonuses = Object.fromEntries(SKILLS.map(([skill, ability]) => [skill, modifiers[ability] + (skills[skill] ? pb : 0)]));
  const saveBonuses = Object.fromEntries(ABILITIES.map(a => [a, modifiers[a] + (saves[a] ? pb : 0)]));
  const initiative = modifiers.dexterity;
  const passivePerception = 10 + skillBonuses.perception;
  const spellModifier = spellcastingAbility ? modifiers[spellcastingAbility] : null;
  return {
    proficiencyBonus: pb, modifiers, skillBonuses, saveBonuses, initiative, passivePerception,
    spellSaveDC: spellModifier === null ? null : 8 + spellModifier + pb,
    spellAttackBonus: spellModifier === null ? null : spellModifier + pb
  };
}

function signed(value) { return value == null ? '—' : formatModifier(value); }

export function renderDerivedStats(container, data, labels = {}) {
  if (!container) return;
  const abilityRows = ABILITIES.map(a => `<div class="derived-row"><span>${labels[a] || a}</span><strong>${signed(data.modifiers[a])}</strong></div>`).join('');
  const skillRows = SKILLS.map(([skill]) => `<div class="derived-row"><span>${labels[skill] || skill}</span><strong>${signed(data.skillBonuses[skill])}</strong></div>`).join('');
  const saveRows = ABILITIES.map(a => `<div class="derived-row"><span>${labels[a] || a}</span><strong>${signed(data.saveBonuses[a])}</strong></div>`).join('');
  container.innerHTML = `
    <div class="derived-summary">
      <div><span>Proficiency</span><strong>+${data.proficiencyBonus}</strong></div>
      <div><span>Initiative</span><strong>${signed(data.initiative)}</strong></div>
      <div><span>Passive Perception</span><strong>${data.passivePerception}</strong></div>
      <div><span>Spell Save DC</span><strong>${data.spellSaveDC ?? '—'}</strong></div>
      <div><span>Spell Attack</span><strong>${signed(data.spellAttackBonus)}</strong></div>
    </div>
    <div class="derived-columns"><div><h4>Ability modifiers</h4>${abilityRows}</div><div><h4>Saving throws</h4>${saveRows}</div><div><h4>Skills</h4>${skillRows}</div></div>`;
}
