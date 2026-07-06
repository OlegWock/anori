import { Heading } from "@anori/design-system/components/Heading/Heading";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

const whatsNew = css({ maxWidth: "600px", overflow: "hidden", display: "flex", flexDirection: "column" });
const scrollArea = css({ marginTop: 0, marginInline: "1-5", marginBottom: "3" });
const content = css({
  display: "flex",
  flexDirection: "column",
  gap: "8",
  paddingInline: "4",
  "& ul": { marginLeft: "6", display: "flex", flexDirection: "column", gap: "2" },
  "& p:not(:last-child)": { marginBottom: "4" },
});
const plusLink = css({ display: "block", textAlign: "center", marginBottom: "4" });

export const WhatsNewImpl = () => {
  const { t, i18n } = useTranslation();
  return (
    <div className={whatsNew}>
      <ScrollArea className={scrollArea}>
        <div className={content}>
          {i18n.language !== "en" && <section>{t("availableOnlyInEnglish")}</section>}

          <section>
            <Heading marginBottom="2">2.0.0</Heading>
            <ul>
              <li>
                Anori has a new look! I tried not to stray too far from the established visual identity, but I finally
                had a chance to polish all the rough edges. I hope you'll like it.
              </li>
              <li>
                Theming was reworked. Now you can switch between light and dark modes for each theme, including your
                custom ones.
              </li>
              <li>
                To create a custom theme you now need to only select one color and Anori will derrive whole palette from
                it. This should make it easier to create your own themes as well as make generated colors more coherent.
                You existing custom themes were migrated automatically.
              </li>
              <li>Performance improvements.</li>
              <li>Bug fixes, of course!</li>
            </ul>
          </section>

          <section>
            <Heading marginBottom="2">1.27.0</Heading>
            <ul>
              <li>Picture widget can now display local images from your device, not just remote URLs.</li>
              <li>Calendar widget now supports Hijri, Persian, Hebrew, and Buddhist calendars.</li>
              <li>Added Vietnamese translation. This was contribution from @itsccao. Thanks!</li>
              <li>
                Translation system was reworked. From now on, new strings will be machine translated into target
                languages rather than kept in English. Translation might not be perfect, so if you notice a mistake or
                awkward wording, you're very welcome to{" "}
                <a href="https://github.com/OlegWock/anori/issues/104" target="_blank" rel="noreferrer">
                  help fix it
                </a>
                .
              </li>
              <li>
                Added Polish, Slovak, Czech, Indonesian, Filipino, and Hindi (machine) translations. If you notice
                something off, please file an issue.
              </li>
              <li>Relaxed size limitation for embedded page, bookmark, and RSS widgets.</li>
            </ul>
          </section>

          <section>
            <Heading marginBottom="2">1.26.0</Heading>
            <p>Couple of big ones in this release!</p>
            <p>
              First of all, we're launching beta of Anori Plus — companion service for Anori. Currently, provides a
              realtime sync of your Anori setup between multiple browsers and devices. We plan to add other features
              later too. It's free while in beta, so give it a try, no credit card required.
            </p>
            <a className={plusLink} href="https://anori.app/plus" target="_blank" rel="noreferrer">
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
            <Heading marginBottom="2">1.25.0</Heading>
            <ul>
              <li>New design of "Add widget" modal.</li>
              <li>Fixed some bugs.</li>
              <li>Added couple of new bugs probably.</li>
            </ul>
          </section>

          <section>
            <Heading marginBottom="2">1.24.0</Heading>
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
            <Heading marginBottom="2">1.23.0</Heading>
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
