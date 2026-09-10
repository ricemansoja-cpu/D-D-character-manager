(() => {
  const root = document.querySelector('#dashboard-view');
  if (!root) return;
  const cleanup = () => {
    root.querySelectorAll('.admin-entry, #admin-entry').forEach(entry => entry.remove());
  };
  cleanup();
  new MutationObserver(cleanup).observe(root, { childList: true, subtree: true });
})();
