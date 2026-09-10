(() => {
  const SUPABASE_URL='https://wmeuebjbvoqudhpwtxyn.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY='sb_publishable_jYrKnt_Unuv5M6XT1t0AaQ_quQTOpCD';
  const supabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
  const root=document.querySelector('#dashboard-view');
  if(!root)return;

  const css=document.createElement('style');
  css.textContent=`
    .campaign-panel{margin-top:24px;padding:18px;border:1px solid var(--border,#374151);border-radius:16px;background:rgba(17,24,39,.55)}
    .campaign-header{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}
    .campaign-header h2{margin:0}.campaign-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-top:14px}
    .campaign-card{padding:14px;border:1px solid var(--border,#374151);border-radius:12px;background:rgba(31,41,55,.5)}
    .campaign-card h3{margin:0 0 5px}.campaign-meta{font-size:.86rem;opacity:.72}.campaign-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
    .campaign-form{display:grid;gap:9px;margin-top:12px}.campaign-form input{width:100%}.campaign-invite{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-top:10px}
    .campaign-message{margin-top:10px}.invite-card{padding:12px;border:1px solid var(--border,#374151);border-radius:10px;margin-top:8px}
    .character-choice-grid{display:grid;gap:8px;margin-top:10px}.character-choice{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px;border:1px solid var(--border,#374151);border-radius:9px}
    .campaign-hidden{display:none!important}.campaign-roster{display:grid;gap:10px;margin-top:12px}.campaign-player{padding:12px;border:1px solid var(--border,#374151);border-radius:10px;background:rgba(17,24,39,.35)}
    .campaign-player-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.campaign-character{margin-top:8px;padding:10px;border-radius:9px;background:rgba(17,24,39,.35);display:grid;grid-template-columns:minmax(0,1fr) repeat(3,auto);gap:10px;align-items:center}
    .campaign-character strong{display:block}.campaign-stat{text-align:center;font-size:.82rem}.campaign-stat strong{font-size:1rem}.campaign-empty{padding:10px 0}.campaign-search-results{display:grid;gap:6px;margin-top:8px}.campaign-search-result{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:9px;border:1px solid var(--border,#374151);border-radius:9px}
  `;
  document.head.appendChild(css);

  const section=document.createElement('section');section.className='campaign-panel';section.innerHTML=`
    <div class="campaign-header"><div><p class="eyebrow">MJ Companion</p><h2 data-campaign-i18n="title">Campaigns</h2><p class="muted" data-campaign-i18n="subtitle">Manage your campaigns, invite players and follow their characters.</p></div><button id="campaign-create" class="button button-primary" type="button" data-campaign-i18n="create">+ Create campaign</button></div>
    <div id="campaign-create-form" class="campaign-form campaign-hidden"><label for="campaign-name" data-campaign-i18n="name">Campaign name</label><input id="campaign-name" maxlength="100" required><label for="campaign-description" data-campaign-i18n="description">Description</label><input id="campaign-description" maxlength="240"><div class="campaign-actions"><button id="campaign-save" class="button button-primary" type="button" data-campaign-i18n="save">Create</button><button id="campaign-cancel" class="button button-secondary" type="button" data-campaign-i18n="cancel">Cancel</button></div></div>
    <div id="campaign-list" class="campaign-grid"></div><div id="campaign-invites" class="campaign-card campaign-hidden"></div><p id="campaign-message" class="status-message campaign-message" role="status" aria-live="polite"></p>`;
  root.appendChild(section);

  const labels={en:{title:'MJ Companion',subtitle:'Manage your campaigns, invite players and follow their characters.',create:'+ Create campaign',name:'Campaign name',description:'Description',save:'Create',cancel:'Cancel',players:'players',invite:'Invite player',username:'Player username',search:'Search',send:'Send invitation',members:'Party',pending:'Pending invitations',accept:'Accept and choose character',decline:'Decline',choose:'Choose character',join:'Join campaign',noCharacters:'You need a character before joining this campaign.',linked:'Character linked',open:'Open campaign',close:'Close',empty:'No campaigns yet.',noMembers:'No players have joined yet.',noCharacter:'No character linked',level:'Level',hp:'HP',ac:'AC',speed:'Speed',searchEmpty:'Enter a username.',searchNone:'No player found.',searchError:'Unable to search players.',self:'You cannot invite yourself.',already:'This player is already in the campaign.'},fr:{title:'Compagnon du MJ',subtitle:'Gérez vos campagnes, invitez les joueurs et suivez leurs personnages.',create:'+ Créer une campagne',name:'Nom de la campagne',description:'Description',save:'Créer',cancel:'Annuler',players:'joueurs',invite:'Inviter un joueur',username:'Pseudo du joueur',search:'Rechercher',send:'Envoyer l’invitation',members:'Groupe',pending:'Invitations en attente',accept:'Accepter et choisir un personnage',decline:'Refuser',choose:'Choisir un personnage',join:'Rejoindre la campagne',noCharacters:'Vous devez créer un personnage avant de rejoindre cette campagne.',linked:'Personnage rattaché',open:'Ouvrir la campagne',close:'Fermer',empty:'Aucune campagne pour le moment.',noMembers:'Aucun joueur n’a encore rejoint la campagne.',noCharacter:'Aucun personnage rattaché',level:'Niveau',hp:'PV',ac:'CA',speed:'Vitesse',searchEmpty:'Saisissez un pseudo.',searchNone:'Aucun joueur trouvé.',searchError:'Impossible de rechercher les joueurs.',self:'Vous ne pouvez pas vous inviter vous-même.',already:'Ce joueur fait déjà partie de la campagne.'}};
  const lang=()=>localStorage.getItem('preferredLanguage')||'en';const t=k=>labels[lang()][k]||k;const msg=(text,type='')=>{const el=section.querySelector('#campaign-message');el.textContent=text;el.className=`status-message campaign-message ${type}`};
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  let user=null,campaigns=[];

  async function loadCampaigns(){
    if(!user)return;
    const {data,error}=await supabase.from('campaigns').select('*').order('created_at',{ascending:false});
    if(error){msg(error.message,'error');return}campaigns=data||[];await renderCampaigns();
  }

  async function renderCampaigns(){
    const list=section.querySelector('#campaign-list');
    if(!campaigns.length){list.innerHTML=`<div class="campaign-card"><p class="muted">${t('empty')}</p></div>`;return}
    const cards=[];
    for(const c of campaigns){
      const isGM=c.owner_user_id===user.id;
      const {data:members}=await supabase.from('campaign_members').select('id,user_id,role,status').eq('campaign_id',c.id).eq('status','active');
      const count=(members||[]).filter(m=>m.role==='player').length;
      cards.push(`<article class="campaign-card"><h3>${esc(c.name)}</h3><p class="campaign-meta">${esc(c.description||'')} · ${count} ${t('players')}</p><div class="campaign-actions"><button class="button button-secondary campaign-open" type="button" data-id="${c.id}">${t('open')}</button>${isGM?`<button class="button button-secondary campaign-invite-toggle" type="button" data-id="${c.id}">${t('invite')}</button>`:''}</div><div id="campaign-detail-${c.id}" class="campaign-hidden"></div></article>`);
    }
    list.innerHTML=cards.join('');
    list.querySelectorAll('.campaign-open').forEach(b=>b.addEventListener('click',()=>openCampaign(b.dataset.id)));
    list.querySelectorAll('.campaign-invite-toggle').forEach(b=>b.addEventListener('click',()=>toggleInvite(b.dataset.id)));
  }

  async function createCampaign(){
    const name=section.querySelector('#campaign-name').value.trim(),description=section.querySelector('#campaign-description').value.trim();
    if(!name){msg(t('name'),'error');return}
    const {data,error}=await supabase.from('campaigns').insert({owner_user_id:user.id,name,description}).select().single();
    if(error){msg(error.message,'error');return}
    const {error:memberError}=await supabase.from('campaign_members').insert({campaign_id:data.id,user_id:user.id,role:'gm'});
    if(memberError){msg(memberError.message,'error');return}
    section.querySelector('#campaign-name').value='';section.querySelector('#campaign-description').value='';section.querySelector('#campaign-create-form').classList.add('campaign-hidden');msg('','');await loadCampaigns();
  }

  async function searchPlayers(campaignId,detail){
    const q=detail.querySelector('.campaign-username').value.trim();const out=detail.querySelector('.campaign-search-results');
    if(!q){out.innerHTML=`<p class="muted">${t('searchEmpty')}</p>`;return}
    const {data,error}=await supabase.from('profiles').select('id,username,display_name').ilike('username',`%${q}%`).order('username').limit(20);
    if(error){out.innerHTML=`<p class="status-message error">${esc(t('searchError'))}</p>`;return}
    if(!data?.length){out.innerHTML=`<p class="muted">${t('searchNone')}</p>`;return}
    out.innerHTML=data.filter(p=>p.id!==user.id).map(p=>`<div class="campaign-search-result"><span><strong>${esc(p.username)}</strong>${p.display_name&&p.display_name!==p.username?`<small class="campaign-meta"> · ${esc(p.display_name)}</small>`:''}</span><button class="button button-primary campaign-invite-user" type="button" data-user-id="${p.id}" data-username="${esc(p.username)}">${t('send')}</button></div>`).join('')||`<p class="muted">${t('searchNone')}</p>`;
    out.querySelectorAll('.campaign-invite-user').forEach(b=>b.addEventListener('click',()=>sendInvite(campaignId,b.dataset.userId,b.dataset.username,detail)));
  }

  async function sendInvite(campaignId,userId,username,detail){
    if(userId===user.id){msg(t('self'),'error');return}
    const {data:existing}=await supabase.from('campaign_members').select('id').eq('campaign_id',campaignId).eq('user_id',userId).eq('status','active').maybeSingle();
    if(existing){msg(t('already'),'error');return}
    const {data:pending}=await supabase.from('campaign_invitations').select('id').eq('campaign_id',campaignId).eq('invited_user_id',userId).eq('status','pending').maybeSingle();
    if(pending){msg(`${username}: ${t('send')}`,'success');return}
    const {error}=await supabase.from('campaign_invitations').insert({campaign_id:campaignId,invited_user_id:userId,invited_by:user.id});
    if(error){msg(error.message,'error');return}
    msg(`${t('send')}: ${username}`,'success');detail.querySelector('.campaign-username').value='';detail.querySelector('.campaign-search-results').innerHTML='';
  }

  async function toggleInvite(id){
    const detail=section.querySelector(`#campaign-detail-${CSS.escape(id)}`);if(!detail)return;
    if(!detail.classList.contains('campaign-hidden')){detail.classList.add('campaign-hidden');return}
    detail.classList.remove('campaign-hidden');detail.innerHTML=`<div class="campaign-invite"><input class="campaign-username" type="search" maxlength="30" placeholder="${t('username')}" autocomplete="off"><button class="button button-primary campaign-search" type="button">${t('search')}</button></div><div class="campaign-search-results"></div>`;
    detail.querySelector('.campaign-search').addEventListener('click',()=>searchPlayers(id,detail));detail.querySelector('.campaign-username').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchPlayers(id,detail)}});
  }

  async function openCampaign(id){
    const c=campaigns.find(x=>x.id===id);if(!c)return;const detail=section.querySelector(`#campaign-detail-${CSS.escape(id)}`);if(!detail)return;
    if(!detail.classList.contains('campaign-hidden')){detail.classList.add('campaign-hidden');return}
    detail.classList.remove('campaign-hidden');detail.innerHTML=`<div class="campaign-card" style="margin-top:10px"><div class="campaign-header"><div><strong>${t('members')}</strong></div><button class="button button-secondary campaign-close-detail" type="button">${t('close')}</button></div><div class="campaign-roster"><p class="muted">${t('members')}…</p></div></div>`;
    const {data:members,error:membersError}=await supabase.from('campaign_members').select('id,user_id,role,status').eq('campaign_id',id).eq('status','active');
    if(membersError){detail.querySelector('.campaign-roster').innerHTML=`<p class="status-message error">${esc(membersError.message)}</p>`;return}
    const players=(members||[]).filter(m=>m.role==='player');
    if(!players.length){detail.querySelector('.campaign-roster').innerHTML=`<p class="campaign-empty muted">${t('noMembers')}</p>`;return}
    const userIds=players.map(p=>p.user_id);const {data:profiles}=await supabase.from('profiles').select('id,username,display_name').in('id',userIds);
    const {data:links, error:linksError}=await supabase.from('campaign_characters').select('character_id,player_user_id,active').eq('campaign_id',id).eq('active',true);
    if(linksError){detail.querySelector('.campaign-roster').innerHTML=`<p class="status-message error">${esc(linksError.message)}</p>`;return}
    const characterIds=(links||[]).map(x=>x.character_id);let chars=[];
    if(characterIds.length){const {data,error}=await supabase.from('characters').select('id,name,level,class_key,species_key,hp_current,hp_max,hp_temporary,armor_class,speed,portrait_url').in('id',characterIds);if(error){detail.querySelector('.campaign-roster').innerHTML=`<p class="status-message error">${esc(error.message)}</p>`;return}chars=data||[];}
    detail.querySelector('.campaign-roster').innerHTML=players.map(player=>{
      const profile=profiles?.find(p=>p.id===player.user_id);const link=links?.find(x=>x.player_user_id===player.user_id);const ch=chars.find(x=>x.id===link?.character_id);
      return `<article class="campaign-player"><div class="campaign-player-head"><div><strong>${esc(profile?.username||'Player')}</strong>${profile?.display_name&&profile.display_name!==profile.username?`<div class="campaign-meta">${esc(profile.display_name)}</div>`:''}</div><span class="campaign-meta">${ch?'':'—'}</span></div>${ch?`<div class="campaign-character">${ch.portrait_url?`<img src="${esc(ch.portrait_url)}" alt="" style="width:42px;height:42px;object-fit:cover;border-radius:8px">`:''}<div><strong>${esc(ch.name)}</strong><span class="campaign-meta">${esc(ch.species_key||'—')} · ${esc(ch.class_key||'—')}</span></div><div class="campaign-stat"><span>${t('level')}</span><strong>${ch.level??1}</strong></div><div class="campaign-stat"><span>${t('hp')}</span><strong>${ch.hp_current??0}/${ch.hp_max??0}</strong></div><div class="campaign-stat"><span>${t('ac')}</span><strong>${ch.armor_class??0}</strong></div></div>`:`<p class="campaign-meta campaign-empty">${t('noCharacter')}</p>`}</article>`;
    }).join('');
    detail.querySelector('.campaign-close-detail').addEventListener('click',()=>detail.classList.add('campaign-hidden'));
  }

  async function loadInvitations(){
    if(!user)return;const {data,error}=await supabase.from('campaign_invitations').select('id,campaign_id,status,created_at,campaigns(id,name,description)').eq('status','pending').order('created_at',{ascending:false});
    const box=section.querySelector('#campaign-invites');if(error||!data?.length){box.classList.add('campaign-hidden');return}box.classList.remove('campaign-hidden');box.innerHTML=`<h3>${t('pending')}</h3>`;
    for(const inv of data){const c=inv.campaigns,row=document.createElement('div');row.className='invite-card';row.innerHTML=`<strong>${esc(c?.name||'Campaign')}</strong><p class="campaign-meta">${esc(c?.description||'')}</p><div class="campaign-actions"><button class="button button-primary invite-accept" type="button">${t('accept')}</button><button class="button button-secondary invite-decline" type="button">${t('decline')}</button></div>`;box.appendChild(row);
      row.querySelector('.invite-decline').addEventListener('click',async()=>{const {error:e}=await supabase.from('campaign_invitations').update({status:'declined',responded_at:new Date().toISOString()}).eq('id',inv.id);if(e){msg(e.message,'error');return}await loadInvitations()});
      row.querySelector('.invite-accept').addEventListener('click',async()=>{const {data:chars,error:e}=await supabase.from('characters').select('id,name,level,class_key,species_key').eq('user_id',user.id).order('name');if(e){msg(e.message,'error');return}if(!chars?.length){msg(t('noCharacters'),'error');return}showCharacterChoice(inv,chars,row)});
    }
  }

  function showCharacterChoice(inv,chars,row){row.innerHTML=`<strong>${t('choose')}</strong><div class="character-choice-grid">${chars.map(c=>`<div class="character-choice"><span>${esc(c.name)} · ${esc(c.class_key||'')} ${c.level||1}</span><button class="button button-primary choose-character" type="button" data-id="${c.id}">${t('join')}</button></div>`).join('')}</div>`;row.querySelectorAll('.choose-character').forEach(b=>b.addEventListener('click',async()=>{b.disabled=true;const {error}=await supabase.rpc('accept_campaign_invitation',{p_invitation_id:inv.id,p_character_id:b.dataset.id});if(error){msg(error.message,'error');b.disabled=false;return}msg(t('linked'),'success');await loadInvitations();await loadCampaigns()}))}

  section.querySelector('#campaign-create').addEventListener('click',()=>section.querySelector('#campaign-create-form').classList.toggle('campaign-hidden'));
  section.querySelector('#campaign-save').addEventListener('click',createCampaign);section.querySelector('#campaign-cancel').addEventListener('click',()=>section.querySelector('#campaign-create-form').classList.add('campaign-hidden'));
  async function syncAuth(){const {data:{user:u}}=await supabase.auth.getUser();user=u;if(user){await loadCampaigns();await loadInvitations()}else{section.querySelector('#campaign-list').innerHTML='';section.querySelector('#campaign-invites').classList.add('campaign-hidden')}}
  supabase.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;if(user){setTimeout(()=>{loadCampaigns();loadInvitations()},0)}});syncAuth();
  window.addEventListener('language-changed',()=>{section.querySelectorAll('[data-campaign-i18n]').forEach(el=>el.textContent=t(el.dataset.campaignI18n));loadCampaigns();loadInvitations()});
})();
