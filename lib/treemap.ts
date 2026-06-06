// Squarified treemap (Bruls, Huizing, van Wijk) — rectangles whose AREA is
// proportional to value, kept as close to square as possible. Used for the
// command-center final view: instantly see WHERE the defended dollars are.

export interface TreeItem<T> {
  value: number;
  data: T;
}

export interface TreeRect<T> {
  x: number;
  y: number;
  w: number;
  h: number;
  data: T;
  value: number;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function worstRatio(row: number[], sideLen: number): number {
  const sum = row.reduce((a, b) => a + b, 0);
  const max = Math.max(...row);
  const min = Math.min(...row);
  const s2 = sum * sum;
  const l2 = sideLen * sideLen;
  return Math.max((l2 * max) / s2, s2 / (l2 * min));
}

function layoutRow<T>(
  row: TreeItem<T>[],
  rowScaled: number[],
  box: Box,
  horizontal: boolean,
  out: TreeRect<T>[]
): Box {
  const sum = rowScaled.reduce((a, b) => a + b, 0);
  if (horizontal) {
    const rowH = sum / box.w;
    let x = box.x;
    row.forEach((it, i) => {
      const w = rowScaled[i] / rowH;
      out.push({ x, y: box.y, w, h: rowH, data: it.data, value: it.value });
      x += w;
    });
    return { x: box.x, y: box.y + rowH, w: box.w, h: box.h - rowH };
  } else {
    const rowW = sum / box.h;
    let y = box.y;
    row.forEach((it, i) => {
      const h = rowScaled[i] / rowW;
      out.push({ x: box.x, y, w: rowW, h, data: it.data, value: it.value });
      y += h;
    });
    return { x: box.x + rowW, y: box.y, w: box.w - rowW, h: box.h };
  }
}

export function squarify<T>(items: TreeItem<T>[], width: number, height: number): TreeRect<T>[] {
  const positive = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  if (!positive.length) return [];
  const totalValue = positive.reduce((a, b) => a + b.value, 0);
  const totalArea = width * height;
  const scale = totalArea / totalValue;
  const scaled = positive.map((i) => i.value * scale);

  const out: TreeRect<T>[] = [];
  let box: Box = { x: 0, y: 0, w: width, h: height };
  let row: TreeItem<T>[] = [];
  let rowScaled: number[] = [];
  let i = 0;

  while (i < positive.length) {
    const horizontal = box.w >= box.h; // lay the row along the shorter side
    const sideLen = horizontal ? box.w : box.h;
    const next = scaled[i];
    const cur = rowScaled.length ? worstRatio(rowScaled, sideLen) : Infinity;
    const withNext = worstRatio([...rowScaled, next], sideLen);

    if (rowScaled.length === 0 || withNext <= cur) {
      row.push(positive[i]);
      rowScaled.push(next);
      i++;
    } else {
      box = layoutRow(row, rowScaled, box, horizontal, out);
      row = [];
      rowScaled = [];
    }
  }
  if (row.length) layoutRow(row, rowScaled, box, box.w >= box.h, out);
  return out;
}
