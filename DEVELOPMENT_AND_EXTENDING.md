# Development and extending

This project is written in TypeScript. React used for UI and SCSS for styling. Thus it will be a lot easier if you know all this tools beforehand. Especially the TypeScript, documentation covers more of a high-level view of project, but most of details you'll be able to deduct by yourself with help of TypeScript types.

To build extension from sources, you need, first of all, install dependencies:

```
yarn install
```

To compile extension you can use either `dev` or `production` command with optional suffix:

```
yarn dev # Development Chrome
yarn dev:ff # Development version for Firefox
```

Compiled code will be placed under `dist` folder.

To install extension from disk refer to instructions for [Chrome](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked) and [Firefox](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#installing).

For easier development, there is also `watch` command which will compile changes as you code:

```
yarn watch
yarn watch:ff
```

## Extending

To extend Anori with your own widgets, you need to create plugin and enable it. Plugin may contain multiple widgets (and can contain none as well). To get a grasp on how plugin might look, check `src/plugins/blueprint` folder. You can use it as base for your own plugin. And also you will need to add your plugin descriptor to `availablePlugins` in `src/plugins/all.ts`.

Besides widgets, plugin may provide configuration component. If present, this component will be rendered in separate section in settings and later widgets can use stored configuration. Currently, this feature isn't used by any plugins, so it probably will require a bit of polishing UI in settings as well.

### Widgets

Widgets are main building blocks of page. Each plugin may provide multiple widgets, each of which described by descriptor (type `WidgetDescriptor`). Each widget should have: 

* ID (there shouldn't be widgets with same ID in one plugin).
* Name.
* Optional configuration screen (if widget requires configuration before adding it to a folder)
* Main component which will be rendered in folder
* Mock component which will be rendered in catalog of widgets (which is presented to user when adding new widget to folder)
* Size of widget. This is desribed not in pixels, but in 'boxes'. While 'box' can we of slightly different size, you can assume it's around 180px for normal mode and 140px for compact mode.
* If widget is resizable, and if so what are minimal and maximal sizes (also in boxes).
* `appearance.withHoverAnimation` property. If set to `true`, Anori will apply scale animation to card on hover.
* `appearance.withoutPadding` property. If set to `true`, Anori won't add 1rem padding to widget card. Usually used to make whole widget clickable (like bookmark widget).

## Useful APIs

There are quite a lot of quality of life utlities and components used across the extension to make developer life easier and user experience better. Let me describe main ones.

### Plugin callbacks

You can provide plugin-wide callbacks which will be invoked either on browser start or periodically. If you provide `onStart` callback, extension will run it on root level of background service worker. Use this callback to register any additional handlers required for your plugin to function. 

You can also provide `scheduledCallback` object with two fields: `intervalInMinutes` and `callback`. This `callback` will be invoked around every `intervalInMinutes` minutes. To limit impact on laptop battery, Anori checks for due callbacks every 5 minutes, so values less than 5 minutes doesn't make much sense. Also, because of this it's not guaranted that your callback will be executed __precisely__ every `intervalInMinutes`.

### Messaging

If you need to run some code in background context (for example modify declarativeNetRequest rules) on demand, you can do so by utilizing messaging. To make messaging type-safe, there is `createOnMessageHandlers` function. It accepts object describing which command you're going to send and how to handle them and returns object `{sendMessage, handlers}`. `handlers` then passed to `onMessage` option of plugin descriptor and `sendMessage` can be used to send messages to background. See example of usage in [bookmark plugin](https://github.com/OlegWock/anori/blob/master/src/plugins/bookmark/bookmark-plugin.tsx).

### Icons

There is a bunch of icons pre-bundled with the extension. We use Iconify under hood and you can see list of available icon sets in [all-sets.ts](/src/components/icons/all-sets.ts) file along with links to details. If you would like to add new set to extension, add it to [generate-icons-assets.ts](/generate-icons-assets.ts) file and run `yarn icons`. Icons are loaded on demand, so there might be quick flash of white semi-transperent square before icons are loaded.

To use icons in your code, you can use `<Icon />` component. There is also a `<Favicon />` component to fetch favicon by URL.

To let user choose an icon in UI, you can use `<IconPicker />`. I recommend to use it inside popover like this:

```jsx
<Popover
    component={IconPicker}
    additionalData={{
        onSelected: (icon: string) => console.log('Selected icon', icon),
    }}
>
    <Button><Icon icon="ion:pencil" width={48} /></Button>
</Popover>
```

(you can find example of usage in [bookmark plugin](https://github.com/OlegWock/anori/blob/master/src/plugins/bookmark/bookmark-plugin.tsx))

### Useful components

> `<RequirePermissions />`

This components allows you easily handle optional permissions. Select which permissions are required for your widget and wrap it in `<RequirePermissions />`. Component will present user a message requesting missing permissions and will render your widget only if all permissions are acquired. Thus, inside component itself you can use those permissions without any additional checks.

> `<PickBookmark />`

If you need user to pick a bookmark from browser, you can use this component. It loads and renders bookmarks by itself, allowing user to search and select bookmark.

> `<ScrollArea />`

Across the extension we use `<ScrollArea />` instead of normal `overflow: scroll`. This allows us to change styling of scrollbars reliably across different browser.

---

There is also a bunch of more common UI element like `<Alert />`, `<Button />`, `<Checkbox />`, `<Hint />`, `<Input />`, `<Modal />`, `<Popover />` and `<Select />`. They are pretty much same you can find in another frontend project, you can see examples of usage across extensions ui and/in plugins. 

### Hooks

There is a couple of hooks you might find useful while developing plugins.

> `useParentFolder()`

This hook exposes info about parent folder of current widget. Info includes folder name, is user currently in edit mode as well as details about grid and ref to grid element.

> `useSizeSettings()`

This hook exposes info about current mode: compact/normal and font size, ideal and minimal block sizes (to get actual value, use `useParentFolder()`) and gap size in that mode. As well as helper `rem` function.

> `getPluginConfig(pluginDescriptor)`
> `usePluginConfig(pluginDescriptor)`

Those functions provide a way to load plugin configuration. Function is imperative and hook is reactive of course.

> `getPluginStorage<StorageT>(pluginId)`
> `usePluginStorage<StorageT>()`

Each plugin can have separate storage dedicated to it. This functions allows you to get instance of [`NamespacedStorage`](/src/utils/namespaced-storage.ts) linked to plugin. Hook can be used in widgets and doesn't require manually providing plugin ID.

> `getWidgetStorage<StorageT>(instanceId)`
> `useWidgetStorage<StorageT>()`

Same as previous, but for widget instances. I.e. each widget instance will have it's separate storage.

> `useWidgetMetadata()`

This hook exposes metadata about current widget: configuration, function to update configuration, instance id, widget id, plugin id and current size. Size is updated in real time as user resizes widget. Will throw if called outside widget.

> `getAllWidgetsByPlugin(pluginDescriptor)`

This function loads all widget instances from selected plugin. Might be useful to loop over all widgets in background task.

### CSS

> `--widget-box-size`
> `--widget-box-size-px`
> `--widget-box-percent`

Those CSS variables set on folder's root element and thus are available for use in widget styles. `--widget-box-size` exposes current box size as number (without unit), `--widget-box-size-px` holds same value, but with `px`, and  `--widget-box-percent` contains value between 0 and 1 (inclusive), where 0 means current box size is smallest possible and 1 is biggest possible.

> `.compact-mode-active`
> `.is-touch-device`
> `.is-android`

Those classes applied to `body` and allow you to apply particular styles only in compact mode or target touch devices or Android. To make life easier, there are also mixin versions of those:

```scss
@use "@anori/components/utils.scss" as utils;

.foo {
    padding: 2rem;
    @include utils.compact { 
        padding: 1rem;
    }
}

// Same with 
// @include utils.touch {}
// @include utils.android {}
```

Also, it's recommended to use `hover` mixin from `utils.scss` instead of `:hover` pseudo-class. This ensures that hover styles will be applied only on devices with mouse and won't be applied on touch devices.