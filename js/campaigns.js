(() => {
  const SUPABASE_URL = 'https://wmeuebjbvoqudhpwtxyn.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_jYrKnt_Unuv5M6XT1t0AaQ_quQTOpCD';
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  const root = document.querySelector('#dashboard-view');
  if (!root) return;

  const css = document.createElement('style');
  css.textContent = `.campaign-panel{margin-top:24px;padding:18px;border:1px solid var(--border,#374151);border-radius:16px;background:rgba(17,24,39,.55)}.campaign-header{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}.campaign-header h2{margin:0}.campaign-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-top:14px}.campaign-card{padding:14px;border:1px solid var(--border,#374151);border-radius:12px;background:rgba(31,41,55,.5)}.campaign-card h3{margin:0 0 5px}.campaign-meta{font-size:.86rem;opacity:.72}.campaign-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.campaign-form{display:grid;gap:9px;margin-top:12px}.campaign-form input,.campaign-form select{width:100%}.campaign-invite{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-top:10px}.campaign-message{margin-top:10px}.invite-card{padding:12px;border:1px solid var(--border,#374151);border-radius:10px;margin-top:8px}.character-choice-grid{display:grid;gap:8px;margin-top:10px}.character-choice{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px;border:1px solid var(--border,#374151);border-radius:9px}.campaign-hidden{display:none!important}`;
  document.head.appendChild(css);

  const section = document.createElement('section');
  section.className = 'campaign-panel';
  section.innerHTML = `<div class="campaign-header"><div><p class="eyebrow" data-campaign-i18n="eyebrow">MJ Companion</p><h2 data-campaign-i18n="title">Campaigns</h2><p class="muted" data-campaign-i18n="subtitle">Create a campaign, invite players and link their characters.</p></div><button id="campaign-create" class="button button-primary" type="button" data-campaign-i18n="create">+ Create campaign</button></div><div id="campaign-create-form" class="campaign-form campaign-hidden"><label for="campaign-name" data-campaign-i18n="name">Campaign name</label><input id="campaign-name" maxlength="100" required><label for="campaign-description" data-campaign-i18n="description">Description</label><input id="campaign-description" maxlength="240"><div class="campaign-actions"><button id="campaign-save" class="button button-primary" type="button" data-campaign-i18n="save">Create</button><button id="campaign-cancel" class="button button-secondary" type="button" data-campaign-i18n="cancel">Cancel</button></div></div><div id="campaign-list" class="campaign-grid"></div><div id="campaign-invites" class="campaign-card campaign-hidden"></div><p id="campaign-message" class="status-message campaign-message" role="status" aria-live="polite"></p>`;
  root.appendChild(section);

  const labels = { en:{eyebrow:'MJ Companion',title:'Campaigns',subtitle:'Create a campaign, invite players and link their characters.',create:'+ Create campaign',name:'Campaign name',description:'Description',save:'Create',cancel:'Cancel',gm:'Game Master',players:'players',invite:'Invite player',email:'Player email',send:'Send invitation',members:'Members',pending:'Pending invitations',accept:'Accept & choose character',decline:'Decline',choose:'Choose character',join:'Join campaign',noCharacters:'You need a character before joining this campaign.',linked:'Character linked',open:'Open campaign',empty:'No campaigns yet.'},fr:{eyebrow:'Compagnon MJ',title:'Campagnes',subtitle:'Créez une campagne, invitez des joueurs et rattachez leurs personnages.',create:'+ Créer une campagne',name:'Nom de la campagne',description:'Description',save:'Créer',cancel:'Annuler',gm:'Maître du jeu',players:'joueurs',invite:'Inviter un joueur',email:'E-mail du joueur',send:'Envoyer l’invitation',members:'Membres',pending:'Invitations en attente',accept:'Accepter et choisir un personnage',decline:'Refuser',choose:'Choisir un personnage',join:'Rejoindre la campagne',noCharacters:'Vous devez créer un personnage avant de rejoindre cette campagne.',linked:'Personnage rattaché',open:'Ouvrir la campagne',empty:'Aucune campagne pour le moment.'}};
  const lang = () => localStorage.getItem('preferredLanguage') || 'en';
  const t = k => labels[lang()][k] || k;
  const msg = (text,type='') => { const el=section.querySelector('#campaign-message'); el.textContent=text; el.className=`status-message campaign-message ${type}`; };
  let user = null;
  let campaigns = [];

  async function getUser(){ const {data:{user:u}}=await supabase.auth.getUser(); user=u; return u; }
  async function loadCampaigns(){
    if(!user) return;
    const {data,error}=await supabase.from('campaigns').select('*').order('created_at',{ascending:false});
    if(error){msg(error.message,'error');return;}
    campaigns=data||[];
    await renderCampaigns();
  }
  async function renderCampaigns(){
    const list=section.querySelector('#campaign-list');
    if(!campaigns.length){list.innerHTML=`<div class="campaign-card"><p class="muted">${t('empty')}</p></div>`;return;}
    const cards=[];
    for(const c of campaigns){
      const isGM=c.owner_user_id===user.id;
      const {data:members}=await supabase.from('campaign_members').select('id,user_id,role,status').eq('campaign_id',c.id).eq('status','active');
      const {data:links}=await supabase.from('campaign_characters').select('character_id,player_user_id,active').eq('campaign_id',c.id).eq('active',true);
      const count=members?.filter(m=>m.role==='player').length||0;
      cards.push(`<article class="campaign-card"><h3>${escapeHtml(c.name)}</h3><p class="campaign-meta">${escapeHtml(c.description||'')} · ${count} ${t('players')}</p><div class="campaign-actions"><button class="button button-secondary campaign-open" type="button" data-id="${c.id}">${t('open')}</button>${isGM?`<button class="button button-secondary campaign-invite-toggle" type="button" data-id="${c.id}">${t('invite')}</button>`:''}</div><div id="campaign-detail-${c.id}" class="campaign-hidden"></div></article>`);
    }
    list.innerHTML=cards.join('');
    list.querySelectorAll('.campaign-open').forEach(b=>b.addEventListener('click',()=>openCampaign(b.dataset.id)));
    list.querySelectorAll('.campaign-invite-toggle').forEach(b=>b.addEventListener('click',()=>toggleInvite(b.dataset.id)));
  }
  function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  async function createCampaign(){
    const name=section.querySelector('#campaign-name').value.trim(); const description=section.querySelector('#campaign-description').value.trim();
    if(!name){msg(t('name'),'error');return;}
    const {data,error}=await supabase.from('campaigns').insert({owner_user_id:user.id,name,description}).select().single();
    if(error){msg(error.message,'error');return;}
    const {error:memberError}=await supabase.from('campaign_members').insert({campaign_id:data.id,user_id:user.id,role:'gm'});
    if(memberError){msg(memberError.message,'error');return;}
    section.querySelector('#campaign-name').value='';section.querySelector('#campaign-description').value='';section.querySelector('#campaign-create-form').classList.add('campaign-hidden');msg('','');await loadCampaigns();
  }
  async function toggleInvite(id){
    const detail=section.querySelector(`#campaign-detail-${CSS.escape(id)}`); if(!detail)return;
    if(!detail.classList.contains('campaign-hidden')){detail.classList.add('campaign-hidden');return;}
    detail.classList.remove('campaign-hidden');detail.innerHTML=`<div class="campaign-invite"><input class="campaign-email" type="email" placeholder="${t('email')}" autocomplete="email"><button class="button button-primary campaign-send" type="button">${t('send')}</button></div><p class="campaign-meta">${t('invite')}</p>`;
    detail.querySelector('.campaign-send').addEventListener('click',async()=>{const email=detail.querySelector('.campaign-email').value.trim().toLowerCase();if(!email){msg(t('email'),'error');return;}const {error}=await supabase.from('campaign_invitations').insert({campaign_id:id,invited_email:email,invited_by:user.id});if(error){msg(error.message,'error');return;}msg(t('send'),'success');detail.querySelector('.campaign-email').value='';});
  }
  async function openCampaign(id){
    const c=campaigns.find(x=>x.id===id); if(!c)return;
    const {data:members}=await supabase.from('campaign_members').select('id,user_id,role,status').eq('campaign_id',id).eq('status','active');
    const {data:links}=await supabase.from('campaign_characters').select('character_id,player_user_id,active').eq('campaign_id',id).eq('active',true);
    const mine=links?.find(x=>x.player_user_id===user.id);
    const isGM=c.owner_user_id===user.id;
    const detail=section.querySelector(`#campaign-detail-${CSS.escape(id)}`); detail.classList.remove('campaign-hidden');
    detail.innerHTML=`<div class="campaign-card" style="margin-top:10px"><strong>${t('members')}</strong><div class="campaign-meta">${members?.length||0} ${t('players')}</div>${isGM?`<div class="campaign-invite"><input class="campaign-email" type="email" placeholder="${t('email')}" autocomplete="email"><button class="button button-primary campaign-send" type="button">${t('send')}</button></div>`:''}<div class="campaign-actions">${mine?`<span class="campaign-meta">${t('linked')}</span>`:''}</div></div>`;
    if(isGM){detail.querySelector('.campaign-send').addEventListener('click',async()=>{const email=detail.querySelector('.campaign-email').value.trim().toLowerCase();if(!email){msg(t('email'),'error');return;}const {error}=await supabase.from('campaign_invitations').insert({campaign_id:id,invited_email:email,invited_by:user.id});if(error){msg(error.message,'error');return;}msg(t('send'),'success');detail.querySelector('.campaign-email').value='';});}
  }
  async function loadInvitations(){
    if(!user)return;
    const {data,error}=await supabase.from('campaign_invitations').select('id,campaign_id,status,created_at,campaigns(id,name,description)').eq('status','pending').order('created_at',{ascending:false});
    const box=section.querySelector('#campaign-invites');
    if(error||!data?.length){box.classList.add('campaign-hidden');return;}
    box.classList.remove('campaign-hidden');box.innerHTML=`<h3>${t('pending')}</h3>`;
    for(const inv of data){
      const c=inv.campaigns; const row=document.createElement('div');row.className='invite-card';row.innerHTML=`<strong>${escapeHtml(c?.name||'Campaign')}</strong><p class="campaign-meta">${escapeHtml(c?.description||'')}</p><div class="campaign-actions"><button class="button button-primary invite-accept" type="button">${t('accept')}</button><button class="button button-secondary invite-decline" type="button">${t('decline')}</button></div>`;box.appendChild(row);
      row.querySelector('.invite-decline').addEventListener('click',async()=>{const {error:e}=await supabase.from('campaign_invitations').update({status:'declined',responded_at:new Date().toISOString()}).eq('id',inv.id);if(e){msg(e.message,'error');return;}await loadInvitations();});
      row.querySelector('.invite-accept').addEventListener('click',async()=>{const {data:chars,error:e}=await supabase.from('characters').select('id,name,level,class_key,species_key').eq('user_id',user.id).order('name');if(e){msg(e.message,'error');return;}if(!chars?.length){msg(t('noCharacters'),'error');return;}showCharacterChoice(inv,chars,row);});
    }
  }
  function showCharacterChoice(inv,chars,row){
    row.innerHTML=`<strong>${t('choose')}</strong><div class="character-choice-grid">${chars.map(c=>`<div class="character-choice"><span>${escapeHtml(c.name)} · ${escapeHtml(c.class_key||'')} ${c.level||1}</span><button class="button button-primary choose-character" type="button" data-id="${c.id}">${t('join')}</button></div>`).join('')}</div>`;
    row.querySelectorAll('.choose-character').forEach(b=>b.addEventListener('click',async()=>{b.disabled=true;const {error}=await supabase.rpc('accept_campaign_invitation',{p_invitation_id:inv.id,p_character_id:b.dataset.id});if(error){msg(error.message,'error');b.disabled=false;return;}msg(t('linked'),'success');await loadInvitations();await loadCampaigns();}));
  }
  section.querySelector('#campaign-create').addEventListener('click',()=>section.querySelector('#campaign-create-form').classList.toggle('campaign-hidden'));
  section.querySelector('#campaign-save').addEventListener('click',createCampaign);
  section.querySelector('#campaign-cancel').addEventListener('click',()=>section.querySelector('#campaign-create-form').classList.add('campaign-hidden'));
  window.addEventListener('auth-state-ready',async e=>{user=e.detail?.user||null;if(user){await loadCampaigns();await loadInvitations();}});
  getUser().then(async u=>{if(u){await loadCampaigns();await loadInvitations();}});
  window.addEventListener('language-changed',()=>{section.querySelectorAll('[data-campaign-i18n]').forEach(el=>{const k=el.dataset.campaignI18n;el.textContent=t(k)});loadCampaigns();loadInvitations();});
})();
