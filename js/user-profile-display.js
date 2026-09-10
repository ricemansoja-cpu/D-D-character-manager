(() => {
  const SUPABASE_URL = 'https://wmeuebjbvoqudhpwtxyn.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_jYrKnt_Unuv5M6XT1t0AaQ_quQTOpCD';
  const { createClient } = window.supabase;
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  const userEmail = document.querySelector('#user-email');
  if (!userEmail) return;

  let usernameElement = document.querySelector('#user-username');
  if (!usernameElement) {
    usernameElement = document.createElement('p');
    usernameElement.id = 'user-username';
    usernameElement.className = 'muted user-username';
    userEmail.insertAdjacentElement('afterend', usernameElement);
  }

  const render = async (user) => {
    if (!user) {
      usernameElement.textContent = '';
      usernameElement.classList.add('hidden');
      return;
    }

    usernameElement.textContent = '';
    usernameElement.classList.add('hidden');

    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();

    if (!error && data?.username) {
      usernameElement.textContent = `@${data.username}`;
      usernameElement.classList.remove('hidden');
    }
  };

  supabase.auth.getSession().then(({ data }) => render(data?.session?.user || null));
  supabase.auth.onAuthStateChange((_event, session) => render(session?.user || null));

  if (!document.querySelector('script[data-mj-player-picker]')) {
    const script = document.createElement('script');
    script.src = 'js/mj-player-picker.js';
    script.dataset.mjPlayerPicker = 'true';
    document.body.appendChild(script);
  }
})();
