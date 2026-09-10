(() => {
  const root = document.querySelector('#dashboard-view');
  if (!root) return;
  const cleanup = () => {
    const entries = root.querySelectorAll('.admin-entry');
    entries.forEach((entry, index) => { if (index > 0) entry.remove(); });
  };
  cleanup();
  new MutationObserver(cleanup).observe(root, { childList: true, subtree: true });
})();
