async function show(platform, locale) {
    document.body.classList.add(`platform-${platform}`);
    initI18n(locale);
}

async function initI18n(locale) {
    console.log('Init i18n for', locale);
    let translation = {};
    try {
        const resp = await fetch(`locales/${locale}.json`);
        translation = await resp.json();
    } catch (err) {

    }
    const respEn = await fetch(`locales/en.json`);
    const enTranslation = await respEn.json();
    const elements = document.querySelectorAll('[data-t-key]');
    elements.forEach(el => {
        const key = el.getAttribute('data-t-key');
        let translatedStr = _.get(translation, key);
        if (!translatedStr) {
            console.log(`${locale} translation for key ${key} is missing`);
            translatedStr = _.get(enTranslation, key);
        }
        if (!translatedStr) return;
        el.textContent = translatedStr;
    });
}

function openPreferences() {
    webkit.messageHandlers.controller.postMessage("open-preferences");
}

document.querySelectorAll("button.open-preferences").forEach(btn => btn.addEventListener("click", openPreferences));
