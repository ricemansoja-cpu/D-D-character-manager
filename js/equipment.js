const SUPABASE_URL = 'https://wmeuebjbvoqudhpwtxyn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_jYrKnt_Unuv5M6XT1t0AaQ_quQTOpCD';
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
let currentCharacterId = null;
let currentLanguage = localStorage.getItem('preferredLanguage') || 'en';

const labels = {
  en: { equipment:'Equipment', title:'Equipment & Inventory', search:'Search equipment…', category:'Category', all:'All', weapon:'Weapons', armor:'Armor', gear:'Adventuring Gear', tool:'Tools', ammunition:'Ammunition', add:'Add', inventory:'Inventory', empty:'Inventory is empty.', qty:'Qty', weight:'Weight', equipped:'Equipped', remove:'Remove', notes:'Notes', save:'Save', currency:'Currency', close:'Close', saved:'Saved.', acUpdated:'Armor Class updated.' },
  fr: { equipment:'Équipement', title:'Équipement & inventaire', search:'Rechercher un équipement…', category:'Catégorie', all:'Tout', weapon:'Armes', armor:'Armures', gear:'Équipement d’aventure', tool:'Outils', ammunition:'Munitions', add:'Ajouter', inventory:'Inventaire', empty:'Inventaire vide.', qty:'Qté', weight:'Poids', equipped:'Équipé', remove:'Supprimer', notes:'Notes', save:'Enregistrer', currency:'Monnaie', close:'Fermer', saved:'Enregistré.', acUpdated:'Classe d’armure mise à jour.' }
};
const t = k => labels[currentLanguage][k] || k;
const escapeHtml = v => String(v ?? '').replace(/[&<>\'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const categoryLabel = c => t(c);

function ensureModal() {
  if (document.querySelector('#equipment-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'equipment-modal'; modal.className = 'modal hidden'; modal.setAttribute('aria-hidden','true');
  modal.innerHTML = `<div class="modal-backdrop" data-close-equipment></div><section class="modal-card equipment-card" role="dialog" aria-modal="true" aria-labelledby="equipment-title">
    <div class="modal-header"><div><p class="eyebrow">D&D 2024</p><h2 id="equipment-title">${t('title')}</h2></div><button class="icon-button" type="button" data-close-equipment>×</button></div>
    <div class="equipment-toolbar"><input id="equipment-search" type="search" placeholder="${t('search')}"><select id="equipment-category"><option value="">${t('all')}</option><option value="weapon">${t('weapon')}</option><option value="armor">${t('armor')}</option><option value="gear">${t('gear')}</option><option value="tool">${t('tool')}</option><option value="ammunition">${t('ammunition')}</option></select></div>
    <div id="equipment-results" class="equipment-results"></div>
    <div class="section-heading"><h3>${t('inventory')}</h3></div><div id="equipment-inventory"></div>
    <div class="section-heading"><h3>${t('currency')}</h3></div><div id="equipment-currency" class="currency-grid"></div>
    <p id="equipment-message" class="status-message" role="status"></p>
    <div class="modal-actions"><button class="button button-secondary" type="button" data-close-equipment>${t('close')}</button></div>
  </section>`;
  document.body.appendChild(modal);
  modal.querySelectorAll('[data-close-equipment]').forEach(e => e.addEventListener('click', closeEquipment));
  modal.querySelector('#equipment-search').addEventListener('input', renderCatalog);
  modal.querySelector('#equipment-category').addEventListener('change', renderCatalog);
}

function openEquipment(characterId) {
  currentCharacterId = characterId; currentLanguage = localStorage.getItem('preferredLanguage') || 'en'; ensureModal();
  const modal = document.querySelector('#equipment-modal'); modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false');
  renderEquipmentStatic(); refreshEquipment();
}
function closeEquipment(){ const modal=document.querySelector('#equipment-modal'); if(modal){modal.classList.add('hidden');modal.setAttribute('aria-hidden','true');} currentCharacterId=null; }
function renderEquipmentStatic(){
  const modal=document.querySelector('#equipment-modal');
  modal.querySelector('#equipment-title').textContent=t('title');
  modal.querySelector('#equipment-search').placeholder=t('search');
  modal.querySelector('#equipment-category').innerHTML=`<option value="">${t('all')}</option><option value="weapon">${t('weapon')}</option><option value="armor">${t('armor')}</option><option value="gear">${t('gear')}</option><option value="tool">${t('tool')}</option><option value="ammunition">${t('ammunition')}</option>`;
  modal.querySelector('.section-heading h3').textContent=t('inventory');
}
async function refreshEquipment(){ await Promise.all([renderCatalog(), loadInventory(), loadCurrency()]); }
async function renderCatalog(){
  if(!currentCharacterId)return;
  const modal=document.querySelector('#equipment-modal'), q=modal.querySelector('#equipment-search').value.trim(), category=modal.querySelector('#equipment-category').value;
  let query=supabase.from('equipment_catalog').select('*').order('category').order('name').limit(100);
  if(q) query=query.ilike('name',`%${q}%`); if(category) query=query.eq('category',category);
  const {data,error}=await query; const box=modal.querySelector('#equipment-results');
  if(error){box.innerHTML=`<p class="status-message error">${escapeHtml(error.message)}</p>`;return;}
  box.innerHTML=(data||[]).map(item=>`<div class="equipment-result"><div><strong>${escapeHtml(item.name)}</strong><span>${categoryLabel(item.category)} · ${item.cost_gp} GP · ${item.weight || 0} lb.</span>${item.properties?.damage?`<small>${escapeHtml(item.properties.damage)} · ${escapeHtml(item.properties.properties||'')}</small>`:''}</div><button class="button button-secondary equipment-add" type="button" data-id="${item.id}">${t('add')}</button></div>`).join('') || `<p class="muted">${t('empty')}</p>`;
  box.querySelectorAll('.equipment-add').forEach(b=>b.addEventListener('click',()=>addInventoryItem(b.dataset.id)));
}
async function addInventoryItem(catalogId){
  const {data:item,error:itemError}=await supabase.from('equipment_catalog').select('*').eq('id',catalogId).single(); if(itemError) return showMessage(itemError.message,'error');
  const {data:existing}=await supabase.from('character_inventory').select('*').eq('character_id',currentCharacterId).eq('item_name',item.name).maybeSingle();
  if(existing){ const {error}=await supabase.from('character_inventory').update({quantity:Number(existing.quantity||0)+1}).eq('id',existing.id); if(error)showMessage(error.message,'error'); }
  else { const {error}=await supabase.from('character_inventory').insert({character_id:currentCharacterId,item_name:item.name,quantity:1,weight:Number(item.weight||0),equipped:false,notes:'',sort_order:Date.now()}); if(error)showMessage(error.message,'error'); }
  await loadInventory();
}
async function loadInventory(){
  const box=document.querySelector('#equipment-inventory'); if(!box||!currentCharacterId)return;
  const {data,error}=await supabase.from('character_inventory').select('*').eq('character_id',currentCharacterId).order('sort_order'); if(error){box.innerHTML=`<p class="status-message error">${escapeHtml(error.message)}</p>`;return;}
  if(!data?.length){box.innerHTML=`<p class="muted">${t('empty')}</p>`;return;}
  box.innerHTML=data.map(i=>`<div class="inventory-row" data-inventory-id="${i.id}"><div class="inventory-main"><strong>${escapeHtml(i.item_name)}</strong><span>${Number(i.weight||0)} lb. ${i.equipped?'· '+t('equipped'):''}</span></div><input class="inventory-qty" type="number" min="0" value="${i.quantity}"><label class="inventory-equipped"><input type="checkbox" class="inventory-equip" ${i.equipped?'checked':''}>${t('equipped')}</label><input class="inventory-notes" value="${escapeHtml(i.notes||'')}" placeholder="${t('notes')}"><button class="icon-button inventory-save" type="button">✓</button><button class="icon-button inventory-remove" type="button">×</button></div>`).join('');
  box.querySelectorAll('.inventory-save').forEach(b=>b.addEventListener('click',()=>saveInventoryRow(b.closest('.inventory-row'))));
  box.querySelectorAll('.inventory-remove').forEach(b=>b.addEventListener('click',()=>removeInventoryRow(b.closest('.inventory-row'))));
}
async function saveInventoryRow(row){ const id=row.dataset.inventoryId; const qty=Number(row.querySelector('.inventory-qty').value); if(qty<=0)return removeInventoryRow(row); const equipped=row.querySelector('.inventory-equip').checked; const notes=row.querySelector('.inventory-notes').value.trim(); const {error}=await supabase.from('character_inventory').update({quantity:qty,equipped,notes}).eq('id',id); if(error)showMessage(error.message,'error'); else { await recalculateArmorClass(); await loadInventory(); showMessage(t('saved'),'success'); } }
async function removeInventoryRow(row){const {error}=await supabase.from('character_inventory').delete().eq('id',row.dataset.inventoryId);if(error)showMessage(error.message,'error');else {await recalculateArmorClass();await loadInventory();}}

async function recalculateArmorClass(){
  if(!currentCharacterId)return;
  const [{data:character,error:characterError},{data:scores,error:scoresError},{data:items,error:itemsError}] = await Promise.all([
    supabase.from('characters').select('id,armor_class').eq('id',currentCharacterId).single(),
    supabase.from('character_ability_scores').select('dexterity').eq('character_id',currentCharacterId).maybeSingle(),
    supabase.from('character_inventory').select('item_name,equipped').eq('character_id',currentCharacterId).eq('equipped',true)
  ]);
  if(characterError||scoresError||itemsError)return;
  const names=(items||[]).map(i=>i.item_name);
  const {data:catalog}=await supabase.from('equipment_catalog').select('name,properties').in('name',names);
  const armor=(catalog||[]).find(i=>i.properties?.is_shield===false && i.properties?.armor_type && i.properties.armor_type!=='shield');
  const shield=(catalog||[]).find(i=>i.properties?.is_shield===true);
  const dexMod=Math.floor(((Number(scores?.dexterity??10))-10)/2);
  let ac=10+dexMod;
  if(armor){ const p=armor.properties; const dexBonus=p.dex_cap===null ? dexMod : Math.min(dexMod,Number(p.dex_cap||0)); ac=Number(p.base_ac||10)+dexBonus; }
  if(shield)ac+=Number(shield.properties?.ac_bonus||0);
  const {error}=await supabase.from('characters').update({armor_class:ac}).eq('id',currentCharacterId);
  if(!error)showMessage(`${t('acUpdated')} (${ac})`,'success');
}
async function loadCurrency(){
  const box=document.querySelector('#equipment-currency'); if(!box||!currentCharacterId)return; const {data,error}=await supabase.from('character_currency').select('*').eq('character_id',currentCharacterId).maybeSingle(); if(error){box.innerHTML=`<p class="status-message error">${escapeHtml(error.message)}</p>`;return;}
  const c=data||{cp:0,sp:0,ep:0,gp:0,pp:0}; box.innerHTML=['cp','sp','ep','gp','pp'].map(k=>`<label><span>${k.toUpperCase()}</span><input class="currency-input" data-currency="${k}" type="number" min="0" value="${c[k]||0}"></label>`).join('')+`<button class="button button-secondary currency-save" type="button">${t('save')}</button>`;
  box.querySelector('.currency-save').addEventListener('click',saveCurrency);
}
async function saveCurrency(){const payload={character_id:currentCharacterId};document.querySelectorAll('.currency-input').forEach(i=>payload[i.dataset.currency]=Number(i.value||0));const {error}=await supabase.from('character_currency').upsert(payload,{onConflict:'character_id'});if(error)showMessage(error.message,'error');else showMessage(t('saved'),'success');}
function showMessage(message,type=''){const el=document.querySelector('#equipment-message');if(el){el.textContent=message;el.className=`status-message ${type}`;}}

function injectButtons(){ document.querySelectorAll('.sheet-open-button').forEach(button=>{if(button.dataset.equipmentBound)return;button.dataset.equipmentBound='1';const id=button.dataset.characterId;const equip=document.createElement('button');equip.className='button button-secondary equipment-open-button';equip.type='button';equip.textContent=t('equipment');equip.dataset.characterId=id;equip.addEventListener('click',()=>openEquipment(id));button.insertAdjacentElement('afterend',equip);}); }
const observer=new MutationObserver(injectButtons); observer.observe(document.body,{childList:true,subtree:true});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeEquipment();});
setInterval(()=>injectButtons(),1000);
