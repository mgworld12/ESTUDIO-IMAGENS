// Máscaras de recorte: Float32Array de largura x altura, de 0 (fundo) a 1 (objeto).

// Desfoque de caixa (horizontal e vertical) com raio r em pixels: deixa a borda suave.
export function suavizar(m, w, h, r) {
  r = Math.round(r); if (r < 1) return m;
  const t = new Float32Array(m.length), o = new Float32Array(m.length), n = 2 * r + 1, cl = (v, max) => v < 0 ? 0 : v > max ? max : v;
  for (let y = 0; y < h; y++) {
    const l = y * w; let s = 0; for (let x = -r; x <= r; x++) s += m[l + cl(x, w - 1)];
    for (let x = 0; x < w; x++) { t[l + x] = s / n; s += m[l + cl(x + r + 1, w - 1)] - m[l + cl(x - r, w - 1)]; }
  }
  for (let x = 0; x < w; x++) {
    let s = 0; for (let y = -r; y <= r; y++) s += t[cl(y, h - 1) * w + x];
    for (let y = 0; y < h; y++) { o[y * w + x] = s / n; s += t[cl(y + r + 1, h - 1) * w + x] - t[cl(y - r, h - 1) * w + x]; }
  }
  return o;
}

// ajuste de -1 (contrair o objeto) a 1 (expandir). 0 não muda nada.
export function ajustar(m, ajuste) {
  if (!ajuste) return m;
  const c = 0.5 - 0.35 * ajuste, o = new Float32Array(m.length);
  for (let i = 0; i < m.length; i++) { const v = (m[i] - c) * 8 + 0.5; o[i] = v < 0 ? 0 : v > 1 ? 1 : v; }
  return o;
}

// Pincel redondo com borda suave: alvo 1 restaura o objeto, alvo 0 apaga.
export function pincel(m, w, h, cx, cy, raio, alvo) {
  const x0 = Math.max(0, Math.floor(cx - raio)), x1 = Math.min(w - 1, Math.ceil(cx + raio)), y0 = Math.max(0, Math.floor(cy - raio)), y1 = Math.min(h - 1, Math.ceil(cy + raio));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const d = Math.hypot(x - cx, y - cy); if (d > raio) continue;
    const peso = Math.min(1, 2 * (1 - d / raio)), i = y * w + x; m[i] += (alvo - m[i]) * peso;
  }
}
