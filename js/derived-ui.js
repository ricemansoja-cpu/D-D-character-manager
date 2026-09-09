import { calculateDerived, formatModifier, renderDerivedStats } from './calculations.js';

const abilities = ['strength','dexterity','constitution','intelligence','wisdom','charisma'];
const skills = ['acrobatics','animal_handling','arcana','athletics','deception','history','insight','intimidation','investigation','medicine','nature','perception','performance','persuasion','religion','sleight_of_hand','stealth','survival'];
const labels = {strength:'Strength',dexterity:'Dexterity',constitution:'Constitution',intelligence:'Intelligence',wisdom:'Wisdom',charisma:'Charisma',acrobatics:'Acrobatics',animal_handling:'Animal Handling',arcana:'Arcana',athletics:'Athletics',deception:'Deception',history:'History',insight:'Insight',intimidation:'Intimidation',investigation:'Investigation',medicine:'Medicine',nature:'Nature',perception:'Perception',performance:'Performance',persuasion:'Persuasion',religion:'Religion',sleight_of_hand:'Sleight of Hand',stealth:'Stealth',survival:'Survival'};

function readSheet() {
  const get = id => document.querySelector(id);
  const scores = Object.fromEntries(abilities.map(a => [a, Number(get(`#score-${a}`)?.value || 10)]));
  const skillsState = Object.fromEntries(skills.map(s => [s, Boolean(get(`[data-skill="${s}"]`)?.checked)]));
  const saves = Object.fromEntries(abilities.map(a => [a, Boolean(get(`[data-save-ability="${a}"]`)?.checked)]));
  const level = Number(get('#sheet-level')?.value || 1);
  const spellcastingAbility = get('#spellcasting-ability')?.value || '';
  return calculateDerived(scores, level, skillsState, saves, spellcastingAbility);
}

function refresh() {
  const target = document.querySelector('#derived-stats');
  if (!target) return;
  renderDerivedStats(target, readSheet(), labels);
}

document.addEventListener('input', refresh);
document.addEventListener('change', refresh);
new MutationObserver(refresh).observe(document.body, { childList: true, subtree: true });
setTimeout(refresh, 0);
