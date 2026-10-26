<div align="center">

# tweakpane-media

**Image and video inputs for [Tweakpane 4](https://tweakpane.github.io/docs/).**
Click or drop a file, get a URL back.

[![npm](https://img.shields.io/npm/v/tweakpane-media)](https://www.npmjs.com/package/tweakpane-media)
[![CI](https://github.com/vyvu99/tweakpane-media/actions/workflows/ci.yml/badge.svg)](https://github.com/vyvu99/tweakpane-media/actions/workflows/ci.yml)
[![size](https://img.shields.io/bundlephobia/minzip/tweakpane-media)](https://bundlephobia.com/package/tweakpane-media)
[![license](https://img.shields.io/npm/l/tweakpane-media)](./LICENSE)

</div>

- **Tiny.** About 2 kB gzipped, plus `@tweakpane/core` which installs automatically.
- **One line to set up.** One bundle registers both inputs.
- **Stays a plain string.** The bound value is just a URL, so it works with Three.js textures, `<img src>` and anything else.
- **Easy to style.** Flat options and `classNames` hooks for Tailwind or custom CSS; follows Tweakpane's theme variables.
- **Typed.** Ships TypeScript declarations.

> [!NOTE]
> Requires Tweakpane 4. For Tweakpane 3, stay on `tweakpane-media@0.x`.

## Install

```sh
pnpm add tweakpane tweakpane-media
# or: npm i tweakpane tweakpane-media
```

## Quick start

```ts
import {Pane} from 'tweakpane';
import {TweakpaneMedia} from 'tweakpane-media';

const pane = new Pane();
pane.registerPlugin(TweakpaneMedia); // registers both image and video

const params = {image: './photo.png', video: './clip.mp4'};

pane.addBinding(params, 'image', {view: 'image', label: 'Image', width: 100});
pane.addBinding(params, 'video', {
	view: 'video',
	label: 'Video',
	width: 100,
	fit: 'cover',
});

pane.on('change', (ev) => console.log(ev.value)); // a URL string
```

Files the user picks become `blob:` URLs. They are revoked automatically when replaced, cleared or when the pane is disposed.

<details>
<summary>Without a bundler (ES modules via CDN)</summary>

```html
<script type="importmap">
	{
		"imports": {
			"tweakpane": "https://cdn.jsdelivr.net/npm/tweakpane@4/dist/tweakpane.js",
			"@tweakpane/core": "https://cdn.jsdelivr.net/npm/@tweakpane/core@2/dist/index.js",
			"tweakpane-media": "https://cdn.jsdelivr.net/npm/tweakpane-media/dist/tweakpane-media.js"
		}
	}
</script>
<script type="module">
	import {Pane} from 'tweakpane';
	import {TweakpaneMedia} from 'tweakpane-media';
</script>
```

</details>

## Options

Pass these to `addBinding` together with `view`.

| Option                      | Type                             | Default                | Description                                             |
| --------------------------- | -------------------------------- | ---------------------- | ------------------------------------------------------- |
| `view`                      | `'image' \| 'video'`             | required               | Which input to render                                   |
| `label`                     | `string`                         |                        | Tweakpane label                                         |
| `width`, `height`           | `number` (px)                    | `100`, auto            | Preview size                                            |
| `fit`                       | `'cover' \| 'contain' \| 'fill'` |                        | CSS `object-fit` of the preview                         |
| `checkbox`                  | `boolean`                        | `false`                | Adds an on/off checkbox; value becomes `{src, checked}` |
| `clearText`                 | `string`                         | `'Clear'`              | Clear button text; `''` hides the button                |
| `accept`                    | `string`                         | `image/*` or `video/*` | `accept` of the file input                              |
| `classNames`                | `{root, preview, clear}`         |                        | Extra class names per part                              |
| `autoplay`, `loop`, `muted` | `boolean`                        | `true`                 | Video only                                              |

All Tweakpane base options (`disabled`, `hidden`, `tag`, `index`) work too.

### Bound value

| `checkbox`        | Value you bind                                                                | Value in `change` events |
| ----------------- | ----------------------------------------------------------------------------- | ------------------------ |
| `false` (default) | `string` URL                                                                  | `string`                 |
| `true`            | `{src: string, checked: boolean}` (a plain string is read as `checked: true`) | `{src, checked}`         |

Unchecking keeps `src` and sets `checked: false`; your code decides what to do with it. Clearing sets `src` to `''` and turns the button into an **Undo** icon, which brings the previous media back. Undo is dropped as soon as new media is set, by picking a file or from your code.

## Styling

```ts
pane.addBinding(params, 'image', {
	view: 'image',
	classNames: {root: 'gap-2', preview: 'rounded', clear: 'text-red-500'},
});
```

Parts carry stable classes you can target: `tp-medv`, `tp-medv_frame`, `tp-medv_drop`, `tp-medv_preview`, `tp-medv_clear`, `tp-medv_check`. Colors and radii come from Tweakpane's CSS variables, so custom Tweakpane themes apply automatically.

## Migrating from 0.x

| 0.x                                                               | 1.x                                     |
| ----------------------------------------------------------------- | --------------------------------------- |
| `pane.addInput`                                                   | `pane.addBinding`                       |
| `registerPlugin({plugins: [PluginImageInput, PluginVideoInput]})` | `registerPlugin(TweakpaneMedia)`        |
| `imgProps.style.width`, `videoProps.width`                        | `width`, `height`, `fit`                |
| `buttonClearProps.children`                                       | `clearText`                             |
| `containerProps.className` and friends                            | `classNames`                            |
| `ev.value` always `{src, checked}`                                | A string unless `checkbox: true`        |
| `config.templateCheckBox: 'tweakpane'`                            | Always styled like Tweakpane's checkbox |
| Unchecking reset the value to the initial one                     | Unchecking keeps `src`                  |
| UMD build via `<script>`                                          | ES modules only (see CDN snippet above) |

## Contributing

```sh
pnpm install
pnpm check    # Biome + TypeScript
pnpm test     # Vitest
pnpm build
pnpm example  # demo page
```

Add a changeset to your PR with `pnpm changeset`. Merging to `main` opens a "Version Packages" PR; merging that publishes to npm.

## License

[MIT](./LICENSE) © vyvu
