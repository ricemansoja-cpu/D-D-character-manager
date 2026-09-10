const SUPABASE_URL = 'https://wmeuebjbvoqudhpwtxyn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_jYrKnt_Unuv5M6XT1t0AaQ_quQTOpCD';
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const loadingView = document.querySelector('#loading-view');
const deniedView = document.querySelector('#denied-view');
const adminView = document.querySelector('#admin-view');
const adminEmail = document.querySelector('#admin-email');
const stats = document.querySelector('#stats');
const usersList = document.querySelector('#users-list');
const searchInput = document.querySelector('#user-search');
const message = document.querySelector('#admin-message');
let profiles = [];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function setMessage(text, type = '') {
  message.textContent = text;
  message.className = `status-message ${type}`;
}
function show(view) {
  loadingView.classList.toggle('hidden', view !== 'loading');
  deniedView.classList.toggle('hidden', view !== 'denied');
  adminView.classList.toggle('hidden', view !== 'admin');
}

async function checkAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { show('denied'); return; }
  const { data: profile, error } = await supabase.from('profiles').select('id,username,display_name,role').eq('id', user.id).single();
  if (error || !profile || profile.role !== 'admin') { show('denied'); return; }
  adminEmail.textContent = user.email || '';
  show('admin');
  await loadDashboard();
}

async function loadDashboard() {
  const [{ count: userCount }, { count: characterCount }, { count: campaignCount }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('characters').select('*', { count: 'exact', head: true }),
    supabase.from('campaigns').select('*', { count: 'exact', head: true })
  ]);
  stats.innerHTML = [
    ['👥', 'Users', userCount ?? 0],
    ['🧙', 'Characters', characterCount ?? 0],
    ['🗺️', 'Campaigns', campaignCount ?? 0]
  ].map(([icon, label, value]) => `<article class="character-card"><div class="character-card-icon">${icon}</div><h2>${label}</h2><p class="character-meta" style="font-size:2rem;font-weight:700">${value}</p></article>`).join('');
  await loadProfiles();
}

async function loadProfiles() {
  const { data, error } = await supabase.from('profiles').select('id,username,display_name,role,created_at').order('created_at', { ascending: true });
  if (error) { setMessage(error.message, 'error'); return; }
  profiles = data || [];
  renderProfiles();
}

function renderProfiles() {
  const q = searchInput.value.trim().toLowerCase();
  const filtered = profiles.filter(p => `${p.username || ''} ${p.display_name || ''}`.toLowerCase().includes(q));
  if (!filtered.length) { usersList.innerHTML = '<p class="muted">No matching users.</p>'; return; }
  usersList.innerHTML = `<div style="display:grid;gap:.75rem">${filtered.map(p => `
    <div style="display:grid;grid-template-columns:1fr auto;gap:1rem;align-items:center;padding:.8rem 0;border-bottom:1px solid rgba(127,127,127,.18)">
      <div><strong>${escapeHtml(p.username)}</strong><div class="muted">${escapeHtml(p.display_name || '')}</div></div>
      <select class="admin-role" data-id="${p.id}" aria-label="Role for ${escapeHtml(p.username)}">
        ${['player','dm','admin'].map(role => `<option value="${role}" ${p.role === role ? 'selected' : ''}>${role}</option>`).join('')}
      </select>
    </div>`).join('')}</div>`;
  usersList.querySelectorAll('.admin-role').forEach(select => select.addEventListener('change', () => updateRole(select.dataset.id, select.value)));
}

async function updateRole(id, role) {
  if (role === 'player' && id === (await supabase.auth.getUser()).data.user?.id) {
    setMessage('You cannot remove your own administrator role from this page.', 'error');
    renderProfiles();
    return;
  }
  const target = profiles.find(p => p.id === id);
  if (target?.role === 'admin' && role !== 'admin') {
    const adminCount = profiles.filter(p => p.role === 'admin').length;
    if (adminCount <= 1) { setMessage('At least one administrator must remain.', 'error'); renderProfiles(); return; }
  }
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
  if (error) { setMessage(error.message, 'error'); return; }
  setMessage('Role updated.', 'success');
  await loadProfiles();
}

searchInput.addEventListener('input', renderProfiles);
document.querySelector('#sign-out').addEventListener('click', async () => { await supabase.auth.signOut(); window.location.href = 'index.html'; });
supabase.auth.onAuthStateChange(() => { checkAdmin(); });
checkAdmin();
