chrome.storage.local.get({stealFocus: false}, (res) => {
    if (!res.stealFocus) return;
    if (window.location.search.includes('focused')) return;
    window.location.search = 'focused';
    throw new Error();
});