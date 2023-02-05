chrome.storage.local.get({stealFocus: false}, (res) => {
    if (!res.stealFocus) return;
    if (location.search.includes('focused')) return;
    location.search = 'focused';
    throw new Error();
});