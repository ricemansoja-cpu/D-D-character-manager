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

let currentLanguage = localStorage.getItem('preferredLanguage') || 'en';

const translations = {
  en: {
    'app.eyebrow': 'D&D 2024', 'app.title': 'Character Manager', 'app.subtitle': 'Create, manage and save your characters securely.', 'app.footer': 'D&D 2024 companion',
    'auth.email': 'Email', 'auth.password': 'Password', 'auth.signIn': 'Sign in', 'auth.signUp': 'Create account', 'auth.signOut': 'Sign out', 'auth.magicLink': 'Send me a magic link',
    'dashboard.eyebrow': 'Your campaign', 'dashboard.title': 'Characters', 'dashboard.newCharacter': '+ New character', 'dashboard.emptyTitle': 'No characters yet', 'dashboard.emptyText': 'Your first D&D 2024 character will appear here.'
  },
  fr: {
    'app.eyebrow': 'D&D 2024', 'app.title': 'Gestionnaire de personnages', 'app.subtitle': 'Créez, gérez et sauvegardez vos personnages en toute sécurité.', 'app.footer': 'Compagnon D&D 2024',
    'auth.email': 'E-mail', 'auth.password': 'Mot de passe', 'auth.signIn': 'Se connecter', 'auth.signUp': 'Créer un compte', 'auth.signOut': 'Se déconnecter', 'auth.magicLink': 'Recevoir un lien de connexion',
    'dashboard.eyebrow': 'Votre campagne', 'dashboard.title': 'Personnages', 'dashboard.newCharacter': '+ Nouveau personnage', 'dashboard.emptyTitle': 'Aucun personnage', 'dashboard.emptyText': 'Votre premier personnage D&D 2024 apparaîtra ici.'
  }
};

function applyLanguage() {
  document.documentElement.lang = currentLanguage;
  languageToggle.textContent = currentLanguage === 'en' ? 'FR' : 'EN';
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const value = translations[currentLanguage][element.dataset.i18n];
    if (value) element.textContent = value;
  });
}

function setMessage(message, type = '') {
  authMessage.textContent = message;
  authMessage.className = `status-message ${type}`;
}

function showAuthenticated(user) {
  authView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  signOutButton.classList.remove('hidden');
  userEmail.textContent = user?.email || '';
}

function showUnauthenticated() {
  authView.classList.remove('hidden');
  dashboardView.classList.add('hidden');
  signOutButton.classList.add('hidden');
  userEmail.textContent = '';
}

async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  setMessage(currentLanguage === 'fr' ? 'Connexion réussie.' : 'Signed in successfully.', 'success');
}

async function signUp(email, password) {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  setMessage(currentLanguage === 'fr' ? 'Compte créé. Vérifiez votre e-mail si une confirmation est demandée.' : 'Account created. Check your email if confirmation is required.', 'success');
}

async function sendMagicLink(email) {
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
  if (error) throw error;
  setMessage(currentLanguage === 'fr' ? 'Lien de connexion envoyé. Vérifiez votre e-mail.' : 'Magic link sent. Check your email.', 'success');
}

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(authForm);
  try {
    setMessage('');
    await signIn(formData.get('email'), formData.get('password'));
  } catch (error) {
    setMessage(error.message, 'error');
  }
});

signUpButton.addEventListener('click', async () => {
  const formData = new FormData(authForm);
  const email = formData.get('email');
  const password = formData.get('password');
  if (!email || !password) {
    setMessage(currentLanguage === 'fr' ? 'Saisissez un e-mail et un mot de passe.' : 'Enter an email and password.', 'error');
    return;
  }
  try { await signUp(email, password); } catch (error) { setMessage(error.message, 'error'); }
});

magicLinkButton.addEventListener('click', async () => {
  const email = new FormData(authForm).get('email');
  if (!email) {
    setMessage(currentLanguage === 'fr' ? 'Saisissez votre e-mail.' : 'Enter your email.', 'error');
    return;
  }
  try { await sendMagicLink(email); } catch (error) { setMessage(error.message, 'error'); }
});

signOutButton.addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut();
  if (error) { setMessage(error.message, 'error'); return; }
  showUnauthenticated();
  setMessage(currentLanguage === 'fr' ? 'Vous êtes déconnecté.' : 'You have been signed out.', 'success');
});

languageToggle.addEventListener('click', () => {
  currentLanguage = currentLanguage === 'en' ? 'fr' : 'en';
  localStorage.setItem('preferredLanguage', currentLanguage);
  applyLanguage();
});

supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) showAuthenticated(session.user);
  else showUnauthenticated();
});

applyLanguage();
const { data: { session } } = await supabase.auth.getSession();
if (session?.user) showAuthenticated(session.user);
