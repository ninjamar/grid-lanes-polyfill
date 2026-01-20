# CSS Grid Lanes Polyfill

A polyfill for the new `display: grid-lanes` CSS feature, enabling support in browsers that do not yet implement it natively.

This implementation is based on the WebKit proposal described here:  
https://webkit.org/blog/17660/introducing-css-grid-lanes/

## Supported Features

- `display: grid-lanes`
- `grid-template-columns` / `grid-template-rows` for lane definition
- `gap`, `column-gap`, `row-gap`
- `item-tolerance` for placement sensitivity
- Spanning items (`grid-column: span N`)
- Explicit placement (`grid-column: N / M`)
- Responsive `auto-fill` / `auto-fit` with `minmax()`
- Both waterfall (columns) and brick (rows) layouts

## Limitations

The following features are **not** supported:

- `fr` units with `grid-template-rows`

## Usage

### 1. Initialize the polyfill

Run the polyfill after the DOM has loaded, and only when native support is missing:

```js
document.addEventListener("DOMContentLoaded", () => {
  if (!GridLanesPolyfill.supportsGridLanes()) {
    GridLanesPolyfill.init({ force: true });
  }
});
````

### 2. Add the required custom property in CSS

For every element using `display: grid-lanes`, you **must** include the following custom property:

```css
.my-grid {
  display: grid-lanes;
  --grid-lanes-polyfill: 1;
}
```

This is required because browsers strip unknown properties and values (including `display: grid-lanes`) during CSS parsing unless a recognized custom property is present. The polyfill uses this custom property as a hook to detect and process affected elements.

## Version

**2.0.0**

## Authors

* Simon Willison
* ninjamar

## License

>MIT

Other files in this repository may be distributed under different licenses. Please check the license header or accompanying license file in each individual file for its specific terms.