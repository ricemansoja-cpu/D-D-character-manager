(() => {
  const URL='https://wmeuebjbvoqudhpwtxyn.supabase.co';
  const KEY='sb_publishable_jYrKnt_Unuv5M6XT1t0AaQ_quQTOpCD';
  let catalog=[];
  let loaded=false;
  const client=window.supabase.createClient(URL,KEY);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function loadCatalog(){if(loaded)return;const {data,error}=await client.from('spell_catalog').select('id,name,level,school,casting_time,range,components,duration,ritual,concentration,classes').order('level').order('name');if(error)throw error;catalog=data||[];loaded=true;}
  function decorate(){document.querySelectorAll('.spell-row').forEach(row=>{const input=row.querySelector('.spell-name');const level=row.querySelector('.spell-level');if(!input||!level||input.dataset.catalogReady)return;input.dataset.catalogReady='1';const listId=`spell-catalog-${Math.random().toString(36).slice(2)}`;const list=document.createElement('datalist');list.id=listId;const max=250;catalog.slice(0,max).forEach(s=>{const option=document.createElement('option');option.value=s.name;option.label=`${s.level===0?'Cantrip':`Lv ${s.level}`} · ${s.school||''}`;list.appendChild(option);});document.body.appendChild(list);input.setAttribute('list',listId);const apply=()=>{const value=input.value.trim().toLowerCase();const spell=catalog.find(s=>s.name.toLowerCase()===value);if(!spell)return;level.value=String(spell.level);const details=[spell.school,spell.casting_time,spell.range,spell.components,spell.duration].filter(Boolean).join(' · ');input.title=details;input.dataset.spellId=spell.id;};input.addEventListener('change',apply);input.addEventListener('input',()=>{const spell=catalog.find(s=>s.name.toLowerCase()===input.value.trim().toLowerCase());if(spell){level.value=String(spell.level);input.dataset.spellId=spell.id;input.title=[spell.school,spell.casting_time,spell.range,spell.components,spell.duration].filter(Boolean).join(' · ');}});apply();});}
  const observer=new MutationObserver(()=>decorate());observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',async e=>{if(!e.target.closest('#sheet-modal'))return;if(e.target.closest('#add-spell-button'))setTimeout(decorate,0);});
  (async()=>{try{await loadCatalog();decorate();}catch(error){console.warn('Spell catalog unavailable',error);}})();
})();
