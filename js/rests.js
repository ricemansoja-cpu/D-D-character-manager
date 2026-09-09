const REST_URL = 'https://wmeuebjbvoqudhpwtxyn.supabase.co';
const REST_KEY = 'sb_publishable_jYrKnt_Unuv5M6XT1t0AaQ_quQTOpCD';
const { createClient: createRestClient } = window.supabase;
const restSupabase = createRestClient(REST_URL, REST_KEY);
let restBusy = false;

async function getRestCharacter() {
  const name = document.querySelector('#sheet-name')?.value?.trim();
  if (!name) return null;
  const { data: { user } } = await restSupabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await restSupabase.from('characters')
    .select('id,name,class_key,level,hp_current,hp_max,hp_temporary,hit_dice,hit_dice_spent,short_rest_count,long_rest_count,death_save_successes,death_save_failures')
    .eq('user_id', user.id).eq('name', name).maybeSingle();
  if (error) throw error;
  return data;
}

function setRestMessage(message, isError = false) {
  const box = document.querySelector('#rest-message');
  if (!box) return;
  box.textContent = message;
  box.classList.toggle('error', isError);
}

async function refreshRestDependentUi() {
  window.dispatchEvent(new CustomEvent('character-rest-applied'));
  if (typeof window.refreshSpellSlots === 'function') await window.refreshSpellSlots();
}

function syncRestFields(character) {
  const values = {
    '#sheet-hp-current': character.hp_current,
    '#sheet-hp-temp': character.hp_temporary,
    '#sheet-death-successes': character.death_save_successes,
    '#sheet-death-failures': character.death_save_failures,
    '#sheet-hit-dice': character.hit_dice
  };
  Object.entries(values).forEach(([selector, value]) => {
    const el = document.querySelector(selector);
    if (el && value !== undefined && value !== null) el.value = value;
  });
}

async function applyShortRest() {
  if (restBusy) return;
  restBusy = true;
  try {
    const character = await getRestCharacter();
    if (!character) return;
    if (Number(character.hp_current || 0) <= 0) {
      setRestMessage('You must have at least 1 HP to start a Short Rest.', true);
      return;
    }
    const maxDice = Number(character.level || 1);
    const spent = Number(character.hit_dice_spent || 0);
    const remaining = Math.max(0, maxDice - spent);
    const con = Number(document.querySelector('#score-constitution')?.value || 10);
    const conMod = Math.floor((con - 10) / 2);
    const die = Number(String(character.hit_dice || '').match(/d(\d+)/)?.[1] || 8);
    if (remaining <= 0) {
      const { error } = await restSupabase.from('characters').update({ short_rest_count: Number(character.short_rest_count || 0) + 1 }).eq('id', character.id);
      if (error) throw error;
      setRestMessage('Short Rest completed. No Hit Dice available to spend.');
      return;
    }
    const roll = Math.floor(Math.random() * die) + 1;
    const healing = Math.max(1, roll + conMod);
    if (!confirm(`Spend 1 Hit Die to regain ${healing} HP?\n\nRoll: ${roll} + CON ${conMod >= 0 ? '+' : ''}${conMod}`)) return;
    const hp = Math.min(Number(character.hp_max || 0), Number(character.hp_current || 0) + healing);
    const { error } = await restSupabase.from('characters').update({
      hp_current: hp,
      hit_dice_spent: spent + 1,
      short_rest_count: Number(character.short_rest_count || 0) + 1
    }).eq('id', character.id);
    if (error) throw error;
    syncRestFields({ ...character, hp_current: hp, hit_dice_spent: spent + 1 });
    setRestMessage(`Short Rest completed: +${healing} HP • ${remaining - 1} Hit Dice remaining.`);
    await refreshRestDependentUi();
  } catch (error) {
    console.error(error);
    setRestMessage('Unable to apply Short Rest.', true);
  } finally { restBusy = false; }
}

async function applyLongRest() {
  if (restBusy) return;
  restBusy = true;
  try {
    const character = await getRestCharacter();
    if (!character) return;
    if (Number(character.hp_current || 0) <= 0) {
      setRestMessage('You must have at least 1 HP to start a Long Rest.', true);
      return;
    }
    if (!confirm('Finish a Long Rest and restore all HP and spent Hit Dice?')) return;
    const hp = Number(character.hp_max || 0);
    const { error } = await restSupabase.from('characters').update({
      hp_current: hp,
      hp_temporary: 0,
      hit_dice_spent: 0,
      death_save_successes: 0,
      death_save_failures: 0,
      long_rest_count: Number(character.long_rest_count || 0) + 1,
      short_rest_count: 0
    }).eq('id', character.id);
    if (error) throw error;
    syncRestFields({ ...character, hp_current: hp, hp_temporary: 0, hit_dice_spent: 0, death_save_successes: 0, death_save_failures: 0 });
    setRestMessage('Long Rest completed: all HP and spent Hit Dice restored.');
    await refreshRestDependentUi();
  } catch (error) {
    console.error(error);
    setRestMessage('Unable to apply Long Rest.', true);
  } finally { restBusy = false; }
}

document.addEventListener('click', event => {
  if (event.target.closest('#short-rest-button')) applyShortRest();
  if (event.target.closest('#long-rest-button')) applyLongRest();
});

document.addEventListener('input', event => {
  if (event.target.matches('#sheet-hp-current,#sheet-hp-temp,#sheet-death-successes,#sheet-death-failures')) setRestMessage('');
});
