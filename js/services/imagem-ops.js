// Operações de imagem sobre um quadro (canvas ou bitmap). Cada uma devolve um canvas novo, na resolução original.
const tela = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });

export function girar(img, graus) {
  const lado = graus % 180 !== 0, c = tela(lado ? img.height : img.width, lado ? img.width : img.height), x = c.getContext('2d');
  x.translate(c.width / 2, c.height / 2); x.rotate(graus * Math.PI / 180); x.drawImage(img, -img.width / 2, -img.height / 2); return c;
}
export function espelhar(img, eixo) {
  const c = tela(img.width, img.height), x = c.getContext('2d');
  if (eixo === 'h') { x.translate(c.width, 0); x.scale(-1, 1); } else { x.translate(0, c.height); x.scale(1, -1); }
  x.drawImage(img, 0, 0); return c;
}
// m = { e, d, t, b }: quanto tirar de cada borda, em % do tamanho
export function recortar(img, m) {
  const x0 = Math.round(img.width * m.e / 100), y0 = Math.round(img.height * m.t / 100), w = Math.max(1, Math.round(img.width * (1 - m.d / 100)) - x0), h = Math.max(1, Math.round(img.height * (1 - m.b / 100)) - y0);
  const c = tela(w, h); c.getContext('2d').drawImage(img, x0, y0, w, h, 0, 0, w, h); return c;
}
export function ajustar(img, { brilho, contraste, saturacao }) {
  const c = tela(img.width, img.height), x = c.getContext('2d');
  if (!('filter' in x)) throw new Error('Este navegador não faz ajustes de cor (use Chrome, Edge ou Firefox).');
  x.filter = `brightness(${brilho}%) contrast(${contraste}%) saturate(${saturacao}%)`; x.drawImage(img, 0, 0); return c;
}
// pos: 0 em cima, 1 no meio, 2 embaixo. tam = altura da letra em % da altura da imagem
export function texto(img, { t, cor, tam, pos }) {
  const c = tela(img.width, img.height), x = c.getContext('2d'), px = Math.max(8, Math.round(img.height * tam / 100));
  x.drawImage(img, 0, 0); x.font = `${px}px Impact, "Arial Black", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  x.lineWidth = Math.max(2, px / 6); x.strokeStyle = '#111'; x.fillStyle = cor;
  const y = [0.12, 0.5, 0.88][pos] * img.height; x.strokeText(t, img.width / 2, y, img.width * 0.96); x.fillText(t, img.width / 2, y, img.width * 0.96); return c;
}
// Miniatura 16 x 16 em tons de cinza, para comparar quadros.
export function assinatura(img) {
  const c = tela(16, 16), x = c.getContext('2d'); x.drawImage(img, 0, 0, 16, 16);
  const d = x.getImageData(0, 0, 16, 16).data, a = new Float32Array(256);
  for (let i = 0; i < 256; i++) a[i] = d[4 * i] * 0.3 + d[4 * i + 1] * 0.59 + d[4 * i + 2] * 0.11;
  return a;
}
