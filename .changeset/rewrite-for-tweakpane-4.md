---
"tweakpane-media": major
---

Rewrite for Tweakpane 4 (`addBinding`). Tweakpane 3 is no longer supported; stay on 0.x for it.

- One `TweakpaneMedia` bundle registers both inputs; `ImageInput` and `VideoInput` are also exported.
- Flat config (`width`, `height`, `fit`, `checkbox`, `clearText`, `classNames`) replaces the `*Props` options.
- The bound value stays a plain URL string unless `checkbox: true`, which binds `{src, checked}`.
- Blob URLs of picked files are revoked on replace/dispose, and duplicate element ids are gone.
- Ships ESM + types only (UMD is dropped); `@tweakpane/core` is a regular dependency instead of being bundled. The obfuscator is removed.
