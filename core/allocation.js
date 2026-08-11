/**
 * Pure allocation maths. No I/O — this module is imported by both the server
 * and the browser, so it must stay free of fs, fetch and process.
 */

/** An asset counts as on target when it is within half a percentage point. */
export const ON_TARGET_EPSILON = 0.005;

/**
 * @param {Array} assets  raw asset records from portfolio.json
 * @returns {{ total: number, rows: Array }}
 */
export function computeState(assets) {
  const priced = assets.map((a) => {
    const price = Number(a.lastPrice) || 0;
    const quantity = Number(a.quantity) || 0;
    return { asset: a, price, quantity, value: price * quantity };
  });

  const total = priced.reduce((sum, p) => sum + p.value, 0);

  const rows = priced.map(({ asset, price, quantity, value }) => {
    const actual = total > 0 ? value / total : 0;
    const deviation = actual - asset.target;
    return {
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      source: asset.source,
      colorSlot: asset.colorSlot,
      target: asset.target,
      quantity,
      price,
      value,
      actual,
      deviation,
      onTarget: Math.abs(deviation) <= ON_TARGET_EPSILON,
      lastPriceAt: asset.lastPriceAt ?? null,
    };
  });

  return { total, rows };
}
