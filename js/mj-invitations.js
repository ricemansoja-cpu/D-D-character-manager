(() => {
  const URL='https://wmeuebjbvoqudhpwtxyn.supabase.co';
  const KEY='sb_publishable_jYrKnt_Unuv5M6XT1t0AaQ_quQTOpCD';
  const db=window.supabase?.createClient(URL,KEY);
  if(!db) return;
  const lang=()=>localStorage.getItem('preferredLanguage')||'en';
  const T={en:{title:'Campaign invitations',empty:'No pending campaign invitations.',from:'invited you to join',accept:'Accept',decline:'Decline',choose:'Choose the character to bring into this campaign',character:'Character',confirm:'Join campaign',cancel:'Cancel',accepted:'Invitation accepted.',declined:'Invitation declined.',error:'Unable to process this invitation.'},fr:{title:'Invitations de campagne',empty:'Aucune invitation de campagne en attente.',from:'vous invite à rejoindre',accept:'Accepter',decline:'Refuser',choose:'Choisissez le personnage qui rejoindra cette campagne',character:'Personnage',confirm:'Rejoindre la campagne',cancel:'Annuler',accepted:'Invitation acceptée.',declined:'Invitation refusée.',error:"Impossible de traiter cette invitation."}};
  const t=k=>T[lang()][k]||k;
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  let user=null, panel=null;
  const style=document.createElement('style');
  style.textContent=`.mj-invitations{margin:18px 0;padding:14px;border:1px solid var(--border,#374151);border-radius:14px;background:rgba(17,24,39,.55)}.mj-invitations-header{display:flex;align-items:center;justify-content:space-between;gap:10px}.mj-inv-badge{display:inline-flex;min-width:24px;height:24px;padding:0 7px;align-items:center;justify-content:center;border-radius:999px;background:var(--accent,#7c3aed);font-weight:700}.mj-inv-list{display:grid;gap:8px;margin-top:10px}.mj-inv-item{padding:12px;border:1px solid var(--border,#374151);border-radius:10px}.mj-inv-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}.mj-inv-modal{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px}.mj-inv-modal .backdrop{position:absolute;inset:0;background:rgba(0,0,0,.7)}.mj-inv-card{position:relative;width:min(520px,100%);max-height:90vh;overflow:auto;padding:18px;border-radius:16px;background:var(--surface,#111827);border:1px solid var(--border,#374151);box-shadow:0 20px 60px rgba(0,0,0,.45)}.mj-inv-card select{width:100%;margin:12px 0}.mj-inv-status{margin-top:8px}`;
  document.head.appendChild(style);
  function renderShell(){
    if(panel) panel.remove();
    const anchor=document.querySelector('#dashboard-view');
    if(!anchor||!user)return;
    panel=document.createElement('section'); panel.className='mj-invitations'; panel.id='mj-invitations';
    panel.innerHTML=`<div class="mj-invitations-header"><div><strong>${t('title')}</strong><span class="mj-inv-badge" id="mj-inv-count">0</span></div></div><div class="mj-inv-list" id="mj-inv-list"><p class="muted">${t('empty')}</p></div>`;
    anchor.insertBefore(panel,anchor.firstChild);
  }
  async function load(){
    if(!user)return;
    renderShell();
    const {data,error}=await db.from('campaign_invitations').select('id,campaign_id,invited_by,created_at,campaigns(name)').eq('invited_user_id',user.id).eq('status','pending').order('created_at',{ascending:false});
    if(error){panel.querySelector('#mj-inv-list').innerHTML=`<p class="status-message error">${esc(error.message)}</p>`;return;}
    const invitations=data||[]; panel.querySelector('#mj-inv-count').textContent=invitations.length;
    if(!invitations.length){panel.querySelector('#mj-inv-list').innerHTML=`<p class="muted">${t('empty')}</p>`;return;}
    const inviterIds=[...new Set(invitations.map(x=>x.invited_by).filter(Boolean))];
    let profiles=[];
    if(inviterIds.length){const r=await db.from('profiles').select('id,username,display_name').in('id',inviterIds);profiles=r.data||[];}
    panel.querySelector('#mj-inv-list').innerHTML=invitations.map(inv=>{
      const p=profiles.find(x=>x.id===inv.invited_by); const campaign=Array.isArray(inv.campaigns)?inv.campaigns[0]:inv.campaigns;
      return `<article class="mj-inv-item"><strong>${esc(campaign?.name||'Campaign')}</strong><div class="muted">@${esc(p?.username||'GM')} ${t('from')}</div><div class="mj-inv-actions"><button class="button button-primary mj-inv-accept" data-id="${inv.id}" data-campaign="${esc(campaign?.name||'Campaign')}">${t('accept')}</button><button class="button button-secondary mj-inv-decline" data-id="${inv.id}">${t('decline')}</button></div></article>`;
    }).join('');
    panel.querySelectorAll('.mj-inv-accept').forEach(b=>b.onclick=()=>accept(b.dataset.id,b.dataset.campaign));
    panel.querySelectorAll('.mj-inv-decline').forEach(b=>b.onclick=()=>decline(b.dataset.id));
  }
  async function accept(invitationId,campaignName){
    const {data,error}=await db.from('characters').select('id,name,level,class_key,species_key').eq('user_id',user.id).order('updated_at',{ascending:false});
    if(error)return alert(t('error'));
    const chars=data||[];
    if(!chars.length){alert(t('error'));return;}
    const modal=document.createElement('div');modal.className='mj-inv-modal';
    modal.innerHTML=`<div class="backdrop"></div><section class="mj-inv-card" role="dialog" aria-modal="true"><h3>${esc(campaignName)}</h3><p>${t('choose')}</p><label>${t('character')}<select id="mj-inv-character">${chars.map(c=>`<option value="${c.id}">${esc(c.name)} · ${t('character')} ${c.level} · ${esc(c.class_key||'')}</option>`).join('')}</select></label><div class="mj-inv-actions"><button class="button button-primary" id="mj-inv-confirm">${t('confirm')}</button><button class="button button-secondary" id="mj-inv-cancel">${t('cancel')}</button></div><p class="mj-inv-status status-message" id="mj-inv-status"></p></section>`;
    document.body.appendChild(modal);
    const close=()=>modal.remove(); modal.querySelector('.backdrop').onclick=close; modal.querySelector('#mj-inv-cancel').onclick=close;
    modal.querySelector('#mj-inv-confirm').onclick=async()=>{
      const characterId=modal.querySelector('#mj-inv-character').value; const btn=modal.querySelector('#mj-inv-confirm');btn.disabled=true;
      const r=await db.rpc('accept_campaign_invitation',{p_invitation_id:invitationId,p_character_id:characterId});
      if(r.error){modal.querySelector('#mj-inv-status').textContent=r.error.message||t('error');btn.disabled=false;return;}
      modal.querySelector('#mj-inv-status').textContent=t('accepted'); setTimeout(()=>{close();load();},500);
    };
  }
  async function decline(id){
    const {error}=await db.from('campaign_invitations').update({status:'declined',responded_at:new Date().toISOString()}).eq('id',id).eq('invited_user_id',user.id).eq('status','pending');
    if(error){alert(error.message);return;} load();
  }
  async function init(){const s=await db.auth.getSession();user=s.data.session?.user||null;if(user)load();}
  db.auth.onAuthStateChange((_e,s)=>{user=s?.user||null;if(user)load();else if(panel){panel.remove();panel=null;}});
  window.addEventListener('language-changed',()=>{if(user)load();});
  init();
})();
