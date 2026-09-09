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
const SUBCLASS_OPTIONS = {
  paladin:['Devotion','Glory','Ancients','Vengeance'],
  wizard:['Abjurer','Diviner','Evoker','Illusionist']
};
const FIGHTING_STYLE_OPTIONS = ['Archery','Defense','Dueling','Great Weapon Fighting','Interception','Protection'];
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
function labelForFeature(name,fr){
  const labels={
    'Lay On Hands':fr?'Imposition des mains':'Lay On Hands','Spellcasting':fr?'Incantation':'Spellcasting','Weapon Mastery':fr?'Maîtrise des armes':'Weapon Mastery',
    'Fighting Style':fr?'Style de combat':'Fighting Style',"Paladin's Smite":fr?'Châtiment du paladin':"Paladin's Smite",'Channel Divinity':fr?'Conduit divin':'Channel Divinity',
    'Paladin Subclass':fr?'Sous-classe de paladin':'Paladin Subclass','Ability Score Improvement':fr?'Amélioration de caractéristique / don':'Ability Score Improvement',
    'Extra Attack':fr?'Attaque supplémentaire':'Extra Attack','Faithful Steed':fr?'Destrier fidèle':'Faithful Steed','Aura of Protection':fr?'Aura de protection':'Aura of Protection',
    'Abjure Foes':fr?'Abjurer les ennemis':'Abjure Foes','Aura of Courage':fr?'Aura de courage':'Aura of Courage','Radiant Strikes':fr?'Frappes radiantes':'Radiant Strikes',
    'Restoring Touch':fr?'Toucher restaurateur':'Restoring Touch','Aura Expansion':fr?'Extension des auras':'Aura Expansion','Epic Boon':fr?'Don épique':'Epic Boon',
    'Arcane Recovery':fr?'Récupération des arcanes':'Arcane Recovery','Ritual Adept':fr?'Adepte des rituels':'Ritual Adept','Scholar':fr?'Érudit':'Scholar',
    'Wizard Subclass':fr?'Sous-classe de magicien':'Wizard Subclass','Memorize Spell':fr?'Mémoriser un sort':'Memorize Spell','Spell Mastery':fr?'Maîtrise des sorts':'Spell Mastery',
    'Subclass Feature':fr?'Capacité de sous-classe':'Subclass Feature'
  };
  return labels[name]||name;
}
function choiceOptions(feature,classKey,fr){
  if(feature.choice_type==='subclass') return (SUBCLASS_OPTIONS[classKey]||[]).map(v=>({value:v,label:v}));
  if(feature.choice_type==='choice' && feature.feature_key==='fighting_style') return FIGHTING_STYLE_OPTIONS.map(v=>({value:v,label:v}));
  if(feature.choice_type==='asi_or_feat') return [{value:'ability_score_improvement',label:fr?'Amélioration de caractéristique':'Ability Score Improvement'},{value:'feat',label:fr?'Don':'Feat'}];
  if(feature.choice_type==='epic_boon_or_feat') return [{value:'epic_boon',label:fr?'Don épique':'Epic Boon'},{value:'feat',label:fr?'Don':'Feat'}];
  if(feature.choice_type==='choice' && feature.feature_key==='scholar') return (feature.metadata?.expertise_skill_options||[]).map(v=>({value:v,label:v.replaceAll('_',' ')}));
  return [];
}

async function saveFeatureChoice(characterId,featureKey,value){
  if(!value)return;
  const {data:existing}=await progressionSupabase.from('character_feature_choices').select('id,choice_value').eq('character_id',characterId).eq('feature_key',featureKey);
  const first=existing?.[0];
  if(first) await progressionSupabase.from('character_feature_choices').delete().eq('id',first.id);
  await progressionSupabase.from('character_feature_choices').insert({character_id:characterId,feature_key:featureKey,choice_value:value,metadata:{source:'progression-ui'}});
  await renderProgression();
}

async function renderFeatureProgression(character,level,fr){
  const box=document.querySelector('#progression-features');
  if(!box)return;
  const [{data:features},{data:choices}]=await Promise.all([
    progressionSupabase.from('class_progression').select('level,feature_key,feature_name,choice_type,metadata').eq('class_key',character.class_key).lte('level',level).order('level').order('feature_key'),
    progressionSupabase.from('character_feature_choices').select('feature_key,choice_value').eq('character_id',character.id)
  ]);
  const choiceMap=new Map((choices||[]).map(c=>[c.feature_key,c.choice_value]));
  if(!features?.length){box.innerHTML='';return;}
  const groups=new Map();
  features.forEach(f=>{if(!groups.has(f.level))groups.set(f.level,[]);groups.get(f.level).push(f);});
  box.innerHTML=`<div class="progression-feature-title">${fr?'Capacités acquises':'Class features'}</div>`+Array.from(groups.entries()).reverse().map(([lv,items])=>`<div class="progression-level"><strong>Lv ${lv}</strong><div class="progression-feature-list">${items.map(f=>{
    const opts=choiceOptions(f,character.class_key,fr); const current=choiceMap.get(f.feature_key)||'';
    return `<div class="progression-feature"><span>${labelForFeature(f.feature_name,fr)}</span>${opts.length?`<select data-feature-key="${f.feature_key}"><option value="">${fr?'Choisir…':'Choose…'}</option>${opts.map(o=>`<option value="${o.value}" ${o.value===current?'selected':''}>${o.label}</option>`).join('')}</select>`:`<small>${f.choice_type==='resource'&&f.metadata?.count?`${fr?'Uses':'Uses'}: ${f.metadata.count}`:''}</small>`}</div>`;
  }).join('')}</div></div>`).join('');
  box.querySelectorAll('select[data-feature-key]').forEach(select=>select.addEventListener('change',()=>saveFeatureChoice(character.id,select.dataset.featureKey,select.value)));
}

let progressionRenderInProgress=false;
let progressionRenderQueued=false;

async function renderProgression(){
  if(progressionRenderInProgress){progressionRenderQueued=true;return;}
  const box=document.querySelector('#progression-stats');
  if(!box||document.querySelector('#sheet-modal')?.classList.contains('hidden'))return;
  const name=document.querySelector('#sheet-name')?.value?.trim();
  const {data:{user}}=await progressionSupabase.auth.getUser();
  if(!user||!name)return;
  progressionRenderInProgress=true;
  try{
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
    box.innerHTML=`<div class="progression-grid"><div><span>${fr?'Classe':'Class'}</span><strong>${CLASS_LABELS[lang][classKey]||classKey}</strong></div><div><span>${fr?'Dé de vie':'Hit die'}</span><strong>d${data.die}</strong></div><div><span>${fr?'Bonus de maîtrise':'Proficiency bonus'}</span><strong>+${2+Math.floor((level-1)/4)}</strong></div><div><span>${fr?'PV max calculés':'Calculated max HP'}</span><strong>${hp}</strong></div><div><span>${fr?'XP niveau actuel':'Current level XP'}</span><strong>${xpForLevel(level).toLocaleString()}</strong></div><div><span>${fr?'Prochain niveau':'Next level'}</span><strong>${next.next?`Lv ${next.next}`:'MAX'}</strong></div></div>${next.next?`<p class="progression-note">${next.remaining===0?(fr?'Niveau atteint.':'Level reached.'):(fr?`${next.remaining.toLocaleString()} XP avant le niveau ${next.next}.`:`${next.remaining.toLocaleString()} XP to level ${next.next}.`)}</p>`:''}`;
    let featureBox=document.querySelector('#progression-features');
    if(!featureBox){featureBox=document.createElement('div');featureBox.id='progression-features';box.insertAdjacentElement('afterend',featureBox);}
    await renderFeatureProgression(character,level,fr);
    const hitDice=document.querySelector('#sheet-hit-dice');
    if(hitDice)hitDice.value=`${level}d${data.die}`;
  } finally {
    progressionRenderInProgress=false;
    if(progressionRenderQueued){progressionRenderQueued=false;setTimeout(renderProgression,0);}
  }
}

document.addEventListener('input',event=>{if(event.target.matches('#sheet-level,#sheet-xp,#score-constitution,#sheet-name'))renderProgression();});
document.addEventListener('change',event=>{if(event.target.matches('#sheet-level,#sheet-xp,#score-constitution'))renderProgression();});
const observer=new MutationObserver(()=>{if(!progressionRenderInProgress && !progressionRenderQueued && !document.querySelector('#sheet-modal')?.classList.contains('hidden')){progressionRenderQueued=true;setTimeout(()=>{progressionRenderQueued=false;renderProgression();},50);}});
observer.observe(document.body,{childList:true,subtree:true});
