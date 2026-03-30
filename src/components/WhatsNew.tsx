import { ScrollArea } from "./ScrollArea";
import "./WhatsNew.scss";
import { useTranslation } from "react-i18next";

export const WhatsNew = () => {
  const { t, i18n } = useTranslation();
  return (
    <div className="WhatsNew">
      <ScrollArea className="WhatsNew-scrollarea">
        <div className="WhatsNew-content">
          {i18n.language !== "en" && <section>{t("availableOnlyInEnglish")}</section>}

          <section>
            <h2>1.26.0</h2>
            <p>Couple of big ones in this release!</p>
            <p>
              First of all, we're launching beta of Anori Plus — companion service for Anori. Currently, provides a
              realtime sync of your Anori setup between multiple browsers and devices. We plan to add other features
              later too. It's free while in beta, so give it a try, no credit card required.
            </p>
            <a className="plus-link" href="https://anori.app/plus" target="_blank" rel="noreferrer">
              Learn more about Anori Plus
            </a>
            <p>
              To power sync we had to significantly rework internals of Anori responsible for storage. This also affects
              backup format, as older backups won't be compatible with this version.{" "}
              <strong>If you use backups you need to export fresh backup now.</strong>
            </p>
            <p>
              And last but not least, Anori now has a Japanese translation. This was contribution from @monta-gh.
              Thanks!
            </p>
          </section>

          <section>
            <h2>1.25.0</h2>
            <ul>
              <li>New design of "Add widget" modal.</li>
              <li>Fixed some bugs.</li>
              <li>Added couple of new bugs probably.</li>
            </ul>
          </section>

          <section>
            <h2>1.24.0</h2>
            <ul>
              <li>Top sites widget is now resizable.</li>
              <li>
                This is again a housekeeping release. I want to cleanup and polish existing features in Anori before
                adding any new ones.
              </li>
              <li>
                I removed some of the features: windowing system (e.g. for widgets like calculator and embedded page),
                command menu, focus stealer, option to hide edit folder button, label plugin. All of them were either
                very rarely used, or didn't feel right from product and/or design point of view.
              </li>
              <li>
                Significantly changed how icons are stored and loaded. All your existing icons should work as previosuly
                (let me know if something broke!), but now they are loaded directly from the icons service (we use{" "}
                <a href="https://iconify.design/" target="_blank" rel="noreferrer">
                  Iconify
                </a>
                , it's great). This allowed to significantly reduce size of the extension and provide even more icons
                than before at the same time.
              </li>
              <li>Bunch of bug fixes and optimization.</li>
              <li>If you enabled sending analytics, in addition to Posthog it will be now sent to Amplitude.</li>
            </ul>
          </section>

          <section>
            <h2>1.23.0</h2>
            <ul>
              <li>This is a housekeeping release. A lot of refactoring, a bit of optimizations, bunch of bugfixes.</li>
              <li>
                Significant changes to analytics. As always, Anori doesn't send any analytics if you didn't enable it
                explicitly. And even then we don't track any sensetive data. You can read more{" "}
                <a href="https://anori.app/privacy">here</a>.
              </li>
            </ul>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
};
