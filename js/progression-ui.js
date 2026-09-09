const PROGRESSION_URL = 'https://wmeuebjbvoqudhpwtxyn.supabase.co';
const PROGRESSION_KEY = 'sb_publishable_jYrKnt_Unuv5M6XT1t0AaQ_quQTOpCD';
const { createClient: createProgressionClient } = window.supabase;
const progressionSupabase = createProgressionClient(PROGRESSION_URL, PROGRESSION_KEY);

const LEVEL_XP = [0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000];
const CLASS_DATA = {
  barbarian:{die:12,fixed:7}, fighter:{die:10,fixed:6}, paladin:{die:10,fixed:6}, ranger:{die:10,fixed:6},
  bard:{die:8,fixed:5}, cleric:{die:8,fixed:5}, druid:{die:8,fixed:5}, monk:{die:8,fixed:5}, rogue:{die:8,fixed:5}, warlock:{die:8,fixed:5},
  sorcerer:{die:6,fixed:4}, wizard:{die:6,fixed:4}
};
const CLASS_LABELS = {en:{barbarian:'Barbarian',bard:'Bard',cleric:'Cleric',druid:'Druid',fighter:'Fighter',monk:'Monk',paladin:'Paladin',ranger:'Ranger',rogue:'Rogue',sorcerer:'Sorcerer',warlock:'Warlock',wizard:'Wizard'},fr:{barbarian:'Barbare',bard:'Barde',cleric:'Clerc',druid:'Druide',fighter:'Guerrier',monk:'Moine',paladin:'Paladin',ranger:'Rôdeur',rogue:'Roublard',sorcerer:'Ensorceleur',warlock:'Occultiste',wizard:'Magicien'}};
const abilityMod = score => Math.floor((Number(score ?? 10)-10)/2);
const xpForLevel = level => LEVEL_XP[Math.max(1,Math.min(20,Number(level)||1))-1];

function fixedHpMax(classKey, level, conScore){
  const data=CLASS_DATA[classKey]||CLASS_DATA.fighter;
  const con=abilityMod(conScore);
  return Math.max(level, data.die+con+Math.max(0,level-1)*Math.max(1,data.fixed+con));
}
function nextLevelInfo(level,xp){
  if(level>=20)return {next:null,remaining:0};
  const target=LEVEL_XP[level];
  return {next:level+1,remaining:Math.max(0,target-Number(xp||0))};
}

async function getActiveCharacter(){
  const modal=document.querySelector('#sheet-modal');
  const name=document.querySelector('#sheet-name')?.value?.trim();
  const {data:{user}}=await progressionSupabase.auth.getUser();
  if(!user||!name||modal?.classList.contains('hidden')) return null;
  const {data,error}=await progressionSupabase.from('characters').select('id,class_key,level,experience,hp_max,hp_current,hit_dice').eq('user_id',user.id).eq('name',name).maybeSingle();
  return error?null:data;
}

async function renderProgression(){
  const box=document.querySelector('#progression-stats');
  if(!box||document.querySelector('#sheet-modal')?.classList.contains('hidden'))return;
  const name=document.querySelector('#sheet-name')?.value?.trim();
  const {data:{user}}=await progressionSupabase.auth.getUser();
  if(!user||!name)return;
  const {data:character}=await progressionSupabase.from('characters').select('id,class_key,level,experience,hp_max,hp_current,hit_dice').eq('user_id',user.id).eq('name',name).maybeSingle();
  if(!character)return;
  const level=Number(document.querySelector('#sheet-level')?.value||character.level||1);
  const xp=Number(document.querySelector('#sheet-xp')?.value||character.experience||0);
  const classKey=character.class_key;
  const data=CLASS_DATA[classKey]||CLASS_DATA.fighter;
  const next=nextLevelInfo(level,xp);
  const con=Number(document.querySelector('#score-constitution')?.value||10);
  const hp=fixedHpMax(classKey,level,con);
  const lang=localStorage.getItem('preferredLanguage')||'en';
  const fr=lang==='fr';
  const asi=[4,8,12,16].includes(level)||(classKey==='rogue'&&level===10);
  box.innerHTML=`<div class="progression-grid"><div><span>${fr?'Classe':'Class'}</span><strong>${CLASS_LABELS[lang][classKey]||classKey}</strong></div><div><span>${fr?'Dé de vie':'Hit die'}</span><strong>d${data.die}</strong></div><div><span>${fr?'Bonus de maîtrise':'Proficiency bonus'}</span><strong>+${2+Math.floor((level-1)/4)}</strong></div><div><span>${fr?'PV max calculés':'Calculated max HP'}</span><strong>${hp}</strong></div><div><span>${fr?'XP niveau actuel':'Current level XP'}</span><strong>${xpForLevel(level).toLocaleString()}</strong></div><div><span>${fr?'Prochain niveau':'Next level'}</span><strong>${next.next?`Lv ${next.next}`:'MAX'}</strong></div></div>${next.next?`<p class="progression-note">${next.remaining===0?(fr?'Niveau atteint.':'Level reached.'):(fr?`${next.remaining.toLocaleString()} XP avant le niveau ${next.next}.`:`${next.remaining.toLocaleString()} XP to level ${next.next}.`)}</p>`:''}${asi?`<p class="progression-note">${fr?'Amélioration de caractéristique / don disponible à ce niveau.':'Ability Score Improvement / feat available at this level.'}</p>`:''}`;
  const hitDice=document.querySelector('#sheet-hit-dice');
  if(hitDice)hitDice.value=`${level}d${data.die}`;
}

document.addEventListener('input',event=>{
  if(event.target.matches('#sheet-level,#sheet-xp,#score-constitution,#sheet-name'))renderProgression();
});
document.addEventListener('change',event=>{
  if(event.target.matches('#sheet-level,#sheet-xp,#score-constitution'))renderProgression();
});
const observer=new MutationObserver(()=>{if(!document.querySelector('#sheet-modal')?.classList.contains('hidden'))setTimeout(renderProgression,50);});
observer.observe(document.body,{childList:true,subtree:true});
