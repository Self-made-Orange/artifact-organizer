export function MosaicGrid(props, renderChildren) {
  const cols = Number.isFinite(props.columns) ? Math.max(2, Math.min(12, props.columns)) : 12;
  const gap = typeof props.gap === "string" ? props.gap : "1rem";
  const rowHeight = typeof props.rowHeight === "string" ? props.rowHeight : "minmax(200px, auto)";
  const dense = props.dense === false ? "" : " op-mosaic-grid-dense";
  const style = `--op-mosaic-cols: ${cols}; --op-mosaic-gap: ${gap}; --op-mosaic-row: ${rowHeight};`;
  return `<section class="op-mosaic-grid${dense}" style="${style}">${renderChildren()}</section>`;
}
