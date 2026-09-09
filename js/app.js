import { createCharacter, getDndOptions, loadCharacters } from './characters.js';

const SUPABASE_URL = 'https://wmeuebjbvoqudhpwtxyn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_jYrKnt_Unuv5M6XT1t0AaQ_quQTOpCD';
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const authView = document.querySelector('#auth-view');
const dashboardView = document.querySelector('#dashboard-view');
const authForm = document.querySelector('#auth-form');
const authMessage = document.querySelector('#auth-message');
const signUpButton = document.querySelector('#sign-up-button');
const magicLinkButton = document.querySelector('#magic-link-button');
const signOutButton = document.querySelector('#sign-out-button');
const languageToggle = document.querySelector('#language-toggle');
const userEmail = document.querySelector('#user-email');
const charactersList = document.querySelector('#characters-list');
const emptyState = document.querySelector('#empty-state');
const newCharacterButton = document.querySelector('#new-character-button');
const characterModal = document.querySelector('#character-modal');
const characterForm = document.querySelector('#character-form');
const characterMessage = document.querySelector('#character-message');

let currentLanguage = localStorage.getItem('preferredLanguage') || 'en';
let currentUser = null;

const translations = {
  en: {
    'app.eyebrow':'D&D 2024','app.title':'Character Manager','app.subtitle':'Create, manage and save your characters securely.','app.footer':'D&D 2024 companion',
    'auth.email':'Email','auth.password':'Password','auth.signIn':'Sign in','auth.signUp':'Create account','auth.signOut':'Sign out','auth.magicLink':'Send me a magic link',
    'dashboard.eyebrow':'Your campaign','dashboard.title':'Characters','dashboard.newCharacter':'+ New character','dashboard.emptyTitle':'No characters yet','dashboard.emptyText':'Your first D&D 2024 character will appear here.',
    'character.createEyebrow':'D&D 2024','character.createTitle':'Create a character','character.name':'Character name','character.class':'Class','character.species':'Species','character.background':'Background','character.create':'Create character','common.cancel':'Cancel',
    'character.level':'Level','character.hp':'HP','character.ac':'AC','character.speed':'Speed','character.created':'Character created.','character.required':'Please complete all fields.','character.failed':'Unable to create the character.'
  },
  fr: {
    'app.eyebrow':'D&D 2024','app.title':'Gestionnaire de personnages','app.subtitle':'Créez, gérez et sauvegardez vos personnages en toute sécurité.','app.footer':'Compagnon D&D 2024',
    'auth.email':'E-mail','auth.password':'Mot de passe','auth.signIn':'Se connecter','auth.signUp':'Créer un compte','auth.signOut':'Se déconnecter','auth.magicLink':'Recevoir un lien de connexion',
    'dashboard.eyebrow':'Votre campagne','dashboard.title':'Personnages','dashboard.newCharacter':'+ Nouveau personnage','dashboard.emptyTitle':'Aucun personnage','dashboard.emptyText':'Votre premier personnage D&D 2024 apparaîtra ici.',
    'character.createEyebrow':'D&D 2024','character.createTitle':'Créer un personnage','character.name':'Nom du personnage','character.class':'Classe','character.species':'Espèce','character.background':'Historique','character.create':'Créer le personnage','common.cancel':'Annuler',
    'character.level':'Niveau','character.hp':'PV','character.ac':'CA','character.speed':'Vitesse','character.created':'Personnage créé.','character.required':'Veuillez remplir tous les champs.','character.failed':'Impossible de créer le personnage.'
  }
};

function t(key) { return translations[currentLanguage][key] || key; }

function applyLanguage() {
  document.documentElement.lang = currentLanguage;
  languageToggle.textContent = currentLanguage === 'en' ? 'FR' : 'EN';
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const value = translations[currentLanguage][element.dataset.i18n];
    if (value) element.textContent = value;
  });
  renderCharactersCache();
}

function setMessage(element, message, type = '') {
  element.textContent = message;
  element.className = `status-message ${type}`;
}

function showAuthenticated(user) {
  currentUser = user;
  authView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  signOutButton.classList.remove('hidden');
  userEmail.textContent = user?.email || '';
  refreshCharacters();
}

function showUnauthenticated() {
  currentUser = null;
  authView.classList.remove('hidden');
  dashboardView.classList.add('hidden');
  signOutButton.classList.add('hidden');
  userEmail.textContent = '';
  closeCharacterModal();
}

async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  setMessage(authMessage, currentLanguage === 'fr' ? 'Connexion réussie.' : 'Signed in successfully.', 'success');
}

async function signUp(email, password) {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  setMessage(authMessage, currentLanguage === 'fr' ? 'Compte créé. Vérifiez votre e-mail si une confirmation est demandée.' : 'Account created. Check your email if confirmation is required.', 'success');
}

async function sendMagicLink(email) {
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
  if (error) throw error;
  setMessage(authMessage, currentLanguage === 'fr' ? 'Lien de connexion envoyé. Vérifiez votre e-mail.' : 'Magic link sent. Check your email.', 'success');
}

let charactersCache = [];

async function refreshCharacters() {
  if (!currentUser) return;
  try {
    charactersCache = await loadCharacters(supabase, currentUser.id);
    renderCharactersCache();
  } catch (error) {
    charactersList.innerHTML = `<p class="status-message error">${escapeHtml(error.message)}</p>`;
    emptyState.classList.add('hidden');
  }
}

function renderCharactersCache() {
  if (!currentUser || !dashboardView || dashboardView.classList.contains('hidden')) return;
  charactersList.innerHTML = '';
  emptyState.classList.toggle('hidden', charactersCache.length > 0);
  charactersCache.forEach((character) => {
    const card = document.createElement('article');
    card.className = 'character-card';
    card.innerHTML = `
      <div class="character-card-icon">⚔️</div>
      <h2>${escapeHtml(character.name || (currentLanguage === 'fr' ? 'Sans nom' : 'Unnamed'))}</h2>
      <p class="character-meta">${escapeHtml(character.species_key || '—')} · ${escapeHtml(character.class_key || '—')}</p>
      <div class="character-stats">
        <span>${t('character.level')} <strong>${character.level ?? 1}</strong></span>
        <span>${t('character.hp')} <strong>${character.hp_current ?? 0}/${character.hp_max ?? 0}</strong></span>
        <span>${t('character.ac')} <strong>${character.armor_class ?? 0}</strong></span>
        <span>${t('character.speed')} <strong>${character.speed ?? 0}</strong></span>
      </div>`;
    charactersList.appendChild(card);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}

function populateCharacterOptions() {
  const { classes, species, backgrounds } = getDndOptions();
  const fill = (id, options) => {
    const select = document.querySelector(id);
    select.innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
  };
  fill('#character-class', classes);
  fill('#character-species', species);
  fill('#character-background', backgrounds);
}

function openCharacterModal() {
  characterForm.reset();
  setMessage(characterMessage, '');
  characterModal.classList.remove('hidden');
  characterModal.setAttribute('aria-hidden', 'false');
  document.querySelector('#character-name').focus();
}

function closeCharacterModal() {
  characterModal.classList.add('hidden');
  characterModal.setAttribute('aria-hidden', 'true');
}

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(authForm);
  try { setMessage(authMessage, ''); await signIn(formData.get('email'), formData.get('password')); }
  catch (error) { setMessage(authMessage, error.message, 'error'); }
});

signUpButton.addEventListener('click', async () => {
  const formData = new FormData(authForm);
  const email = formData.get('email');
  const password = formData.get('password');
  if (!email || !password) { setMessage(authMessage, currentLanguage === 'fr' ? 'Saisissez un e-mail et un mot de passe.' : 'Enter an email and password.', 'error'); return; }
  try { await signUp(email, password); } catch (error) { setMessage(authMessage, error.message, 'error'); }
});

magicLinkButton.addEventListener('click', async () => {
  const email = new FormData(authForm).get('email');
  if (!email) { setMessage(authMessage, currentLanguage === 'fr' ? 'Saisissez votre e-mail.' : 'Enter your email.', 'error'); return; }
  try { await sendMagicLink(email); } catch (error) { setMessage(authMessage, error.message, 'error'); }
});

signOutButton.addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut();
  if (error) { setMessage(authMessage, error.message, 'error'); return; }
  showUnauthenticated();
  setMessage(authMessage, currentLanguage === 'fr' ? 'Vous êtes déconnecté.' : 'You have been signed out.', 'success');
});

languageToggle.addEventListener('click', () => {
  currentLanguage = currentLanguage === 'en' ? 'fr' : 'en';
  localStorage.setItem('preferredLanguage', currentLanguage);
  applyLanguage();
});

newCharacterButton.addEventListener('click', openCharacterModal);
document.querySelectorAll('[data-close-modal]').forEach((element) => element.addEventListener('click', closeCharacterModal));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !characterModal.classList.contains('hidden')) closeCharacterModal(); });

characterForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentUser) return;
  const values = Object.fromEntries(new FormData(characterForm).entries());
  if (!values.name || !values.classKey || !values.speciesKey || !values.backgroundKey) { setMessage(characterMessage, t('character.required'), 'error'); return; }
  const submitButton = document.querySelector('#create-character-submit');
  submitButton.disabled = true;
  try {
    await createCharacter(supabase, currentUser.id, values);
    closeCharacterModal();
    await refreshCharacters();
  } catch (error) {
    setMessage(characterMessage, `${t('character.failed')} ${error.message}`, 'error');
  } finally { submitButton.disabled = false; }
});

supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) showAuthenticated(session.user);
  else showUnauthenticated();
});

populateCharacterOptions();
applyLanguage();
const { data: { session } } = await supabase.auth.getSession();
if (session?.user) showAuthenticated(session.user);
else showUnauthenticated();
