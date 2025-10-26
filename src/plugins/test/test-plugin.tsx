import { Button } from "@anori/components/Button";
import "./styles.scss";
import { WidgetExpandArea } from "@anori/components/WidgetExpandArea";
import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { useSizeSettings } from "@anori/utils/compact";
import { definePlugin, defineWidget } from "@anori/utils/plugins/define";
import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import type { EmptyObject } from "@anori/utils/types";
import { AnimatePresence } from "framer-motion";
import { useState } from "react";

const MainScreen = (_props: WidgetRenderProps<EmptyObject>) => {
  const { rem } = useSizeSettings();
  const [showExpandableArea, setShowExpandableArea] = useState(false);

  return (
    <button
      type="button"
      className="ExpandableTestWidget"
      onClick={() => !showExpandableArea && setShowExpandableArea(true)}
    >
      <Icon icon={builtinIcons.logos.notion} height={rem(4)} width={rem(4)} />

      <AnimatePresence>
        {showExpandableArea && (
          <WidgetExpandArea title="Test widget" onClose={() => setShowExpandableArea(false)} size="max" closable>
            <h2>Hello here!</h2>
            <Button onClick={() => setShowExpandableArea(false)}>Hide</Button>

            <p>
              <span>
                Lorem ipsum dolor sit amet, consectetur adipisicing elit. Fuga delectus minima optio eos consectetur
                placeat, quo tempore odit dolorem nostrum maiores, suscipit facere harum blanditiis labore libero minus
                eligendi ipsam?
              </span>
              <span>
                Omnis rerum quis et quaerat asperiores magnam cumque, alias sint ratione porro non vitae iusto numquam
                est perspiciatis assumenda dignissimos nulla laudantium molestiae consequuntur veniam aut accusantium
                voluptatem! Cum, magnam!
              </span>
            </p>
            <div style={{ height: "2rem", alignSelf: "stretch", background: "green" }} />
            <p>
              <span>
                Lorem ipsum dolor, sit amet consectetur adipisicing elit. Maiores molestias fugit laboriosam aliquam.
                Consequatur, corporis alias ex laboriosam officiis, natus porro veritatis temporibus veniam rerum in
                voluptatibus numquam amet eum.
              </span>
              <span>
                Aliquam vero consectetur corporis corrupti nesciunt voluptate ullam! Natus commodi maxime, mollitia, nam
                non necessitatibus dignissimos hic eveniet a et harum minima fugiat, unde officia repellendus delectus
                distinctio iure culpa.
              </span>
            </p>
            <p>
              <span>
                Lorem ipsum dolor sit amet, consectetur adipisicing elit. Eveniet debitis commodi quibusdam eaque
                reiciendis dolore quod laudantium quidem harum. Dolorem reiciendis aliquam nulla perferendis nostrum
                pariatur aperiam! Impedit, at reiciendis?
              </span>
              <span>
                Debitis id ratione quo magnam sunt voluptatem nihil fugit quidem modi, repudiandae veritatis expedita?
                Quod iusto voluptate illum doloremque reprehenderit eos saepe cumque rerum, dolor aspernatur consequatur
                ratione quisquam! Rerum.
              </span>
            </p>
            <p>
              <span>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Vel quam iusto necessitatibus corporis, libero
                eius beatae. Hic iste obcaecati quidem illum, accusamus asperiores labore odit delectus? Quos amet
                facere quo!
              </span>
              <span>
                Tenetur in velit, dolorum eius ut quibusdam laudantium vitae expedita amet deleniti laborum? Explicabo,
                modi. Consequatur dicta iure aspernatur labore necessitatibus quam dolores cum totam repellat saepe,
                eius harum in!
              </span>
            </p>
            <p>
              <span>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Nihil nam nobis cupiditate omnis, molestias
                reprehenderit laudantium non consequuntur natus animi perferendis molestiae ipsam quasi eveniet expedita
                maxime ducimus distinctio ipsum?
              </span>
              <span>
                Nulla tenetur, esse eos voluptatum cumque vitae fugit odit mollitia in incidunt quos praesentium
                inventore eaque! Veritatis iure nisi facilis exercitationem corrupti soluta, ipsam omnis molestias nulla
                saepe eos odit.
              </span>
            </p>
          </WidgetExpandArea>
        )}
      </AnimatePresence>
    </button>
  );
};

const MainScreen2 = (_Props: WidgetRenderProps<EmptyObject>) => {
  const { rem } = useSizeSettings();

  return (
    <div className="ExpandableTestWidget">
      <Icon icon={builtinIcons.logos.github} height={rem(4)} width={rem(4)} />
    </div>
  );
};

const widgetDescriptor = defineWidget({
  id: "widget",
  get name() {
    return "Expandable widget";
  },
  configurationScreen: null,
  mainScreen: MainScreen,
  mock: () => {
    return <MainScreen instanceId="mock" config={{}} />;
  },
  appearance: {
    size: {
      width: 1,
      height: 1,
    },
    resizable: false,
    withHoverAnimation: true,
    withoutPadding: true,
  },
});

const widgetDescriptor2 = defineWidget({
  id: "widget-2",
  get name() {
    return "Resizable widget";
  },
  configurationScreen: null,
  mainScreen: MainScreen2,
  mock: () => {
    return <MainScreen2 instanceId="mock" config={{}} />;
  },
  appearance: {
    size: {
      width: 1,
      height: 1,
    },
    resizable: {
      min: {
        width: 1,
        height: 1,
      },
      max: {
        width: 5,
        height: 4,
      },
    },
    withHoverAnimation: false,
    withoutPadding: true,
  },
});

export const testPlugin = definePlugin({
  id: "test-plugin",
  get name() {
    return "Test plugin";
  },
  icon: builtinIcons.plugin,
  configurationScreen: null,
}).withWidgets(widgetDescriptor, widgetDescriptor2);
