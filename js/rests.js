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
    .select('id,name,class_key,level,hp_current,hp_max,hit_dice_spent,short_rest_count,long_rest_count')
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

async function applyShortRest() {
  if (restBusy) return;
  restBusy = true;
  try {
    const character = await getRestCharacter();
    if (!character) return;
    const maxDice = Number(character.level || 1);
    const spent = Number(character.hit_dice_spent || 0);
    const remaining = Math.max(0, maxDice - spent);
    const con = Number(document.querySelector('#score-constitution')?.value || 10);
    const conMod = Math.floor((con - 10) / 2);
    const die = Number(String(character.hit_dice || '').match(/d(\d+)/)?.[1] || 8);
    const roll = Math.floor(Math.random() * die) + 1;
    const healing = Math.max(0, roll + conMod);
    const shouldUse = remaining > 0 && confirm(`Spend 1 Hit Die to regain ${healing} HP?\n\nRoll: ${roll} + CON ${conMod >= 0 ? '+' : ''}${conMod}`);
    if (shouldUse) {
      const hp = Math.min(Number(character.hp_max || 0), Number(character.hp_current || 0) + healing);
      const { error } = await restSupabase.from('characters').update({ hp_current: hp, hit_dice_spent: spent + 1, short_rest_count: Number(character.short_rest_count || 0) + 1 }).eq('id', character.id);
      if (error) throw error;
      document.querySelector('#sheet-hp-current').value = hp;
      setRestMessage(`Short Rest: +${healing} HP • ${remaining - 1} Hit Dice remaining.`);
    } else if (remaining === 0) {
      const { error } = await restSupabase.from('characters').update({ short_rest_count: Number(character.short_rest_count || 0) + 1 }).eq('id', character.id);
      if (error) throw error;
      setRestMessage('Short Rest completed. No Hit Dice available.');
    }
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
    document.querySelector('#sheet-hp-current').value = hp;
    document.querySelector('#sheet-hp-temp').value = 0;
    document.querySelector('#sheet-death-successes').value = 0;
    document.querySelector('#sheet-death-failures').value = 0;
    setRestMessage('Long Rest completed: HP restored, Hit Dice restored, death saves cleared.');
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
  if (event.target.matches('#sheet-hp-current,#sheet-hp-temp,#sheet-death-successes,#sheet-death-failures')) {
    setRestMessage('');
  }
});
