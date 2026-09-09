import { createCharacter, getDndOptions, loadCharacters } from './characters.js';
import { loadCharacterSheet, saveCharacterSheet, ABILITIES } from './character-sheet.js';

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
const sheetModal = document.querySelector('#sheet-modal');
const sheetForm = document.querySelector('#sheet-form');
const sheetMessage = document.querySelector('#sheet-message');

let currentLanguage = localStorage.getItem('preferredLanguage') || 'en';
let currentUser = null;
let currentSheetCharacterId = null;
let charactersCache = [];

const translations = {
  en: {
    'app.eyebrow':'D&D 2024','app.title':'Character Manager','app.subtitle':'Create, manage and save your characters securely.','app.footer':'D&D 2024 companion',
    'auth.email':'Email','auth.password':'Password','auth.signIn':'Sign in','auth.signUp':'Create account','auth.signOut':'Sign out','auth.magicLink':'Send me a magic link',
    'dashboard.eyebrow':'Your campaign','dashboard.title':'Characters','dashboard.newCharacter':'+ New character','dashboard.emptyTitle':'No characters yet','dashboard.emptyText':'Your first D&D 2024 character will appear here.','dashboard.open':'Open sheet',
    'character.createEyebrow':'D&D 2024','character.createTitle':'Create a character','character.name':'Character name','character.class':'Class','character.species':'Species','character.background':'Background','character.create':'Create character','common.cancel':'Cancel',
    'character.level':'Level','character.hp':'HP','character.ac':'AC','character.speed':'Speed','character.required':'Please complete all fields.','character.failed':'Unable to create the character.',
    'sheet.eyebrow':'D&D 2024','sheet.title':'Character sheet','sheet.level':'Level','sheet.experience':'Experience','sheet.hitDice':'Hit dice','sheet.combat':'Combat','sheet.hpCurrent':'Current HP','sheet.hpMax':'Max HP','sheet.hpTemporary':'Temp HP','sheet.abilities':'Ability scores','sheet.inspiration':'Heroic Inspiration','sheet.save':'Save changes','sheet.saved':'Changes saved.','sheet.failed':'Unable to save changes.','sheet.loading':'Loading character...'
  },
  fr: {
    'app.eyebrow':'D&D 2024','app.title':'Gestionnaire de personnages','app.subtitle':'Créez, gérez et sauvegardez vos personnages en toute sécurité.','app.footer':'Compagnon D&D 2024',
    'auth.email':'E-mail','auth.password':'Mot de passe','auth.signIn':'Se connecter','auth.signUp':'Créer un compte','auth.signOut':'Se déconnecter','auth.magicLink':'Recevoir un lien de connexion',
    'dashboard.eyebrow':'Votre campagne','dashboard.title':'Personnages','dashboard.newCharacter':'+ Nouveau personnage','dashboard.emptyTitle':'Aucun personnage','dashboard.emptyText':'Votre premier personnage D&D 2024 apparaîtra ici.','dashboard.open':'Ouvrir la fiche',
    'character.createEyebrow':'D&D 2024','character.createTitle':'Créer un personnage','character.name':'Nom du personnage','character.class':'Classe','character.species':'Espèce','character.background':'Historique','character.create':'Créer le personnage','common.cancel':'Annuler',
    'character.level':'Niveau','character.hp':'PV','character.ac':'CA','character.speed':'Vitesse','character.required':'Veuillez remplir tous les champs.','character.failed':'Impossible de créer le personnage.',
    'sheet.eyebrow':'D&D 2024','sheet.title':'Fiche de personnage','sheet.level':'Niveau','sheet.experience':'Expérience','sheet.hitDice':'Dé de vie','sheet.combat':'Combat','sheet.hpCurrent':'PV actuels','sheet.hpMax':'PV max','sheet.hpTemporary':'PV temporaires','sheet.abilities':'Caractéristiques','sheet.inspiration':'Inspiration héroïque','sheet.save':'Enregistrer','sheet.saved':'Modifications enregistrées.','sheet.failed':'Impossible d’enregistrer les modifications.','sheet.loading':'Chargement du personnage...'
  }
};

const abilityLabels = {
  en: { strength:'Strength', dexterity:'Dexterity', constitution:'Constitution', intelligence:'Intelligence', wisdom:'Wisdom', charisma:'Charisma' },
  fr: { strength:'Force', dexterity:'Dextérité', constitution:'Constitution', intelligence:'Intelligence', wisdom:'Sagesse', charisma:'Charisme' }
};

function t(key) { return translations[currentLanguage][key] || key; }
function setMessage(element, message, type = '') { element.textContent = message; element.className = `status-message ${type}`; }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char])); }

function applyLanguage() {
  document.documentElement.lang = currentLanguage;
  languageToggle.textContent = currentLanguage === 'en' ? 'FR' : 'EN';
  document.querySelectorAll('[data-i18n]').forEach((element) => { const value = translations[currentLanguage][element.dataset.i18n]; if (value) element.textContent = value; });
  renderAbilityInputs();
  renderCharactersCache();
}

function showAuthenticated(user) { currentUser = user; authView.classList.add('hidden'); dashboardView.classList.remove('hidden'); signOutButton.classList.remove('hidden'); userEmail.textContent = user?.email || ''; refreshCharacters(); }
function showUnauthenticated() { currentUser = null; authView.classList.remove('hidden'); dashboardView.classList.add('hidden'); signOutButton.classList.add('hidden'); userEmail.textContent = ''; closeCharacterModal(); closeSheetModal(); }

async function signIn(email, password) { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; setMessage(authMessage, currentLanguage === 'fr' ? 'Connexion réussie.' : 'Signed in successfully.', 'success'); }
async function signUp(email, password) { const { error } = await supabase.auth.signUp({ email, password }); if (error) throw error; setMessage(authMessage, currentLanguage === 'fr' ? 'Compte créé. Vérifiez votre e-mail si une confirmation est demandée.' : 'Account created. Check your email if confirmation is required.', 'success'); }
async function sendMagicLink(email) { const redirectTo = window.location.origin + window.location.pathname; const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } }); if (error) throw error; setMessage(authMessage, currentLanguage === 'fr' ? 'Lien de connexion envoyé. Vérifiez votre e-mail.' : 'Magic link sent. Check your email.', 'success'); }

async function refreshCharacters() {
  if (!currentUser) return;
  try { charactersCache = await loadCharacters(supabase, currentUser.id); renderCharactersCache(); }
  catch (error) { charactersList.innerHTML = `<p class="status-message error">${escapeHtml(error.message)}</p>`; emptyState.classList.add('hidden'); }
}

function renderCharactersCache() {
  if (!currentUser || dashboardView.classList.contains('hidden')) return;
  charactersList.innerHTML = '';
  emptyState.classList.toggle('hidden', charactersCache.length > 0);
  charactersCache.forEach((character) => {
    const card = document.createElement('article'); card.className = 'character-card';
    card.innerHTML = `<div class="character-card-icon">⚔️</div><h2>${escapeHtml(character.name || (currentLanguage === 'fr' ? 'Sans nom' : 'Unnamed'))}</h2><p class="character-meta">${escapeHtml(character.species_key || '—')} · ${escapeHtml(character.class_key || '—')}</p><div class="character-stats"><span>${t('character.level')} <strong>${character.level ?? 1}</strong></span><span>${t('character.hp')} <strong>${character.hp_current ?? 0}/${character.hp_max ?? 0}</strong></span><span>${t('character.ac')} <strong>${character.armor_class ?? 0}</strong></span><span>${t('character.speed')} <strong>${character.speed ?? 0}</strong></span></div><button class="button button-secondary sheet-open-button" type="button" data-character-id="${character.id}">${t('dashboard.open')}</button>`;
    charactersList.appendChild(card);
  });
  document.querySelectorAll('.sheet-open-button').forEach((button) => button.addEventListener('click', () => openSheetModal(button.dataset.characterId)));
}

function populateCharacterOptions() {
  const { classes, species, backgrounds } = getDndOptions();
  const fill = (id, options) => { document.querySelector(id).innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join(''); };
  fill('#character-class', classes); fill('#character-species', species); fill('#character-background', backgrounds);
}
function openCharacterModal() { characterForm.reset(); setMessage(characterMessage, ''); characterModal.classList.remove('hidden'); characterModal.setAttribute('aria-hidden', 'false'); document.querySelector('#character-name').focus(); }
function closeCharacterModal() { characterModal.classList.add('hidden'); characterModal.setAttribute('aria-hidden', 'true'); }
function renderAbilityInputs(values = {}) { const grid = document.querySelector('#ability-scores-grid'); if (!grid) return; grid.innerHTML = ABILITIES.map((ability) => `<div class="ability-box"><label for="score-${ability}">${abilityLabels[currentLanguage][ability]}</label><input id="score-${ability}" name="${ability}" type="number" min="1" max="30" value="${values[ability] ?? 10}" required /></div>`).join(''); }

async function openSheetModal(characterId) {
  currentSheetCharacterId = characterId; sheetModal.classList.remove('hidden'); sheetModal.setAttribute('aria-hidden', 'false'); setMessage(sheetMessage, t('sheet.loading'));
  try {
    const { character, scores } = await loadCharacterSheet(supabase, characterId, currentUser.id);
    document.querySelector('#sheet-name').value = character.name || ''; document.querySelector('#sheet-level').value = character.level ?? 1; document.querySelector('#sheet-xp').value = character.experience ?? 0; document.querySelector('#sheet-hit-dice').value = character.hit_dice || '';
    document.querySelector('#sheet-hp-current').value = character.hp_current ?? 0; document.querySelector('#sheet-hp-max').value = character.hp_max ?? 0; document.querySelector('#sheet-hp-temp').value = character.hp_temporary ?? 0; document.querySelector('#sheet-ac').value = character.armor_class ?? 10; document.querySelector('#sheet-speed').value = character.speed ?? 30; document.querySelector('#sheet-inspiration').checked = Boolean(character.inspiration_heroic);
    renderAbilityInputs(scores || {}); setMessage(sheetMessage, '');
  } catch (error) { setMessage(sheetMessage, `${t('sheet.failed')} ${error.message}`, 'error'); }
}
function closeSheetModal() { sheetModal.classList.add('hidden'); sheetModal.setAttribute('aria-hidden', 'true'); currentSheetCharacterId = null; }

characterForm.addEventListener('submit', async (event) => {
  event.preventDefault(); if (!currentUser) return; const values = Object.fromEntries(new FormData(characterForm).entries());
  if (!values.name || !values.classKey || !values.speciesKey || !values.backgroundKey) { setMessage(characterMessage, t('character.required'), 'error'); return; }
  const submitButton = document.querySelector('#create-character-submit'); submitButton.disabled = true;
  try { await createCharacter(supabase, currentUser.id, values); closeCharacterModal(); await refreshCharacters(); } catch (error) { setMessage(characterMessage, `${t('character.failed')} ${error.message}`, 'error'); } finally { submitButton.disabled = false; }
});

sheetForm.addEventListener('submit', async (event) => {
  event.preventDefault(); if (!currentUser || !currentSheetCharacterId) return;
  const values = Object.fromEntries(new FormData(sheetForm).entries()); values.inspirationHeroic = document.querySelector('#sheet-inspiration').checked;
  const scores = Object.fromEntries(ABILITIES.map((ability) => [ability, values[ability]])); const submitButton = document.querySelector('#save-sheet-submit'); submitButton.disabled = true;
  try { await saveCharacterSheet(supabase, currentSheetCharacterId, currentUser.id, values, scores); setMessage(sheetMessage, t('sheet.saved'), 'success'); await refreshCharacters(); } catch (error) { setMessage(sheetMessage, `${t('sheet.failed')} ${error.message}`, 'error'); } finally { submitButton.disabled = false; }
});

authForm.addEventListener('submit', async (event) => { event.preventDefault(); const formData = new FormData(authForm); try { setMessage(authMessage, ''); await signIn(formData.get('email'), formData.get('password')); } catch (error) { setMessage(authMessage, error.message, 'error'); } });
signUpButton.addEventListener('click', async () => { const formData = new FormData(authForm); const email = formData.get('email'); const password = formData.get('password'); if (!email || !password) { setMessage(authMessage, currentLanguage === 'fr' ? 'Saisissez un e-mail et un mot de passe.' : 'Enter an email and password.', 'error'); return; } try { await signUp(email, password); } catch (error) { setMessage(authMessage, error.message, 'error'); } });
magicLinkButton.addEventListener('click', async () => { const email = new FormData(authForm).get('email'); if (!email) { setMessage(authMessage, currentLanguage === 'fr' ? 'Saisissez votre e-mail.' : 'Enter your email.', 'error'); return; } try { await sendMagicLink(email); } catch (error) { setMessage(authMessage, error.message, 'error'); } });
signOutButton.addEventListener('click', async () => { const { error } = await supabase.auth.signOut(); if (error) { setMessage(authMessage, error.message, 'error'); return; } showUnauthenticated(); setMessage(authMessage, currentLanguage === 'fr' ? 'Vous êtes déconnecté.' : 'You have been signed out.', 'success'); });
languageToggle.addEventListener('click', () => { currentLanguage = currentLanguage === 'en' ? 'fr' : 'en'; localStorage.setItem('preferredLanguage', currentLanguage); applyLanguage(); });
newCharacterButton.addEventListener('click', openCharacterModal);
document.querySelectorAll('[data-close-modal]').forEach((element) => element.addEventListener('click', closeCharacterModal));
document.querySelectorAll('[data-close-sheet]').forEach((element) => element.addEventListener('click', closeSheetModal));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { if (!characterModal.classList.contains('hidden')) closeCharacterModal(); if (!sheetModal.classList.contains('hidden')) closeSheetModal(); } });
supabase.auth.onAuthStateChange((_event, session) => { if (session?.user) showAuthenticated(session.user); else showUnauthenticated(); });

populateCharacterOptions(); renderAbilityInputs(); applyLanguage();
const { data: { session } } = await supabase.auth.getSession(); if (session?.user) showAuthenticated(session.user); else showUnauthenticated();
