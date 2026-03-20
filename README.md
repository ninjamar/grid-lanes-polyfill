# CSS Grid Lanes Polyfill

A polyfill for the new `display: grid-lanes` CSS feature, enabling support in browsers that do not yet implement it natively.

This implementation is based on the WebKit proposal described here:  
https://webkit.org/blog/17660/introducing-css-grid-lanes/

[Originally written by Simon Willison](https://github.com/simonw/tools/blob/main/grid-lanes-polyfill.js), this edition features numerous enhancements to make the original work properly.

## Supported Features

- Inline stylesheets, `script` element, imported stylesheets
- `display: grid-lanes`
- `grid-template-columns` / `grid-template-rows` for lane definition
- `gap`, `column-gap`, `row-gap`
- `--flow-tolerance` for placement sensitivity
- Spanning items (`grid-column: span N`)
- Explicit placement (`grid-column: N / M`)
- Responsive `auto-fill` / `auto-fit` with `minmax()` (See [section 3](#3-using---grid-template-columns-and---grid-template-rows-for-auto-fill--auto-fit))
- Both waterfall (columns) and brick (rows) layouts

## Limitations

The following features are **not** supported:

- `fr` units with `grid-template-rows`

## Usage

### 1. Load and Initialize the polyfill

Use ES6 modules to load and initialize the polyfill:

```html
<script type="module">
  import GridLanesPolyfill from "./grid-lanes-polyfill.js";
  // OR with named imports:
  // import { supportsGridLanes, init } from "./grid-lanes-polyfill.js";

  document.addEventListener("DOMContentLoaded", () => {
    if (!GridLanesPolyfill.supportsGridLanes()) {
      GridLanesPolyfill.init({ force: true });
    }
  });
</script>
```

Alternatively, use named imports:

```js
import { supportsGridLanes, init } from "./grid-lanes-polyfill.js";

document.addEventListener("DOMContentLoaded", () => {
  if (!supportsGridLanes()) {
    init({ force: true });
  }
});
```

### 2. Add the required custom property in CSS

For every element using `display: grid-lanes`, you **must** include the following custom property:

```css
.my-grid {
  --grid-lanes-polyfill: 1;
  display: grid-lanes;
}
```

This is required because browsers strip unknown properties and values (including `display: grid-lanes`) during CSS parsing. The polyfill uses this custom property as a hook to detect and process affected elements.

> [!NOTE]
> The script parses CSS in many ways. Inline styles and root stylesheets may be parsed "as is", meaning that this custom property technically is not always needed. However, this is subject to change, so it is important to include it.

### 3. Using `--grid-template-columns` and `--grid-template-rows` for `auto-fill` / `auto-fit`

When using `repeat(auto-fill, ...)` or `repeat(auto-fit, ...)` in your grid template, you **must** provide a custom property version of the same template. This is because browsers do not compute the value properly of `grid-template-columns` if it contains `auto-fill` and `auto-fit`.

```css
.gallery {
  --grid-lanes-polyfill: 1;
  display: grid-lanes;
  /* grid-template-columns: ...*/
  --grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
```

## Version

**2.0.0**

## Authors

- Simon Willison
- ninjamar

## License

> MIT

Other files in this repository may be distributed under different licenses. Please check the license header or accompanying license file in each individual file for its specific terms.
