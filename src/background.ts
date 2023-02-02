import browser from 'webextension-polyfill';

console.log("I'm background worker!");
browser.action.setBadgeText({
    text: 'Pew!',
});
