import { metade } from '../core/imagem.js';

// Remoção de fundo no navegador: onnxruntime-web (MIT) + modelo U²-Net pequeno (Apache-2.0), ambos em vendor/.
const VENDOR = new URL('../../vendor/', import.meta.url).href;
export const ORT_URL = VENDOR + 'ort/', MODELO_URL = VENDOR + 'modelos/u2netp.onnx', LADO = 320, DOWNLOAD_MB = 19;
const WASM_BYTES = 14848852, MODELO_BYTES = 4574861;
let sessao = null, ort = null;

// Baixa um arquivo mostrando o progresso e guarda no cache do navegador (próximas vezes não baixa de novo).
async function obter(url, rotulo, esperado, aoProgresso) {
  const cache = typeof caches !== 'undefined' ? await caches.open('image-studio-modelos-v1') : null, guardado = cache && await cache.match(url);
  if (guardado) return guardado.arrayBuffer();
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Não foi possível baixar ${rotulo} (erro ${r.status}). Confira se a pasta vendor/ foi publicada no GitHub.`);
  const partes = [], leitor = r.body.getReader(); let lido = 0;
  for (;;) { const { done, value } = await leitor.read(); if (done) break; partes.push(value); lido += value.length; aoProgresso?.(rotulo, Math.min(lido, esperado), esperado); }
  const blob = new Blob(partes);
  if (cache) { try { await cache.put(url, new Response(blob)); } catch { /* sem espaço no cache: segue sem guardar */ } }
  return blob.arrayBuffer();
}

export async function carregar(aoProgresso) {
  if (sessao) return sessao;
  ort = await import(ORT_URL + 'ort.min.mjs');
  ort.env.wasm.numThreads = 1; ort.env.wasm.wasmPaths = ORT_URL;
  ort.env.wasm.wasmBinary = new Uint8Array(await obter(ORT_URL + 'ort-wasm-simd-threaded.wasm', 'o motor de IA', WASM_BYTES, aoProgresso));
  const modelo = await obter(MODELO_URL, 'o modelo de IA', MODELO_BYTES, aoProgresso);
  sessao = await ort.InferenceSession.create(new Uint8Array(modelo), { executionProviders: ['wasm'] });
  return sessao;
}

// rgba: pixels de uma imagem LADO x LADO. Devolve a máscara (Float32Array LADO*LADO, 0 a 1). Mesmo pré e pós-processamento do rembg.
export async function inferir(ortLib, sess, rgba) {
  const n = LADO * LADO, x = new Float32Array(3 * n), M = [0.485, 0.456, 0.406], S = [0.229, 0.224, 0.225];
  let max = 0; for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) if (rgba[4 * i + c] > max) max = rgba[4 * i + c];
  max = max || 1;
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) x[c * n + i] = (rgba[4 * i + c] / max - M[c]) / S[c];
  const saida = await sess.run({ [sess.inputNames[0]]: new ortLib.Tensor('float32', x, [1, 3, LADO, LADO]) });
  const p = saida[sess.outputNames[0]].data; let mi = Infinity, ma = -Infinity;
  for (let i = 0; i < n; i++) { if (p[i] < mi) mi = p[i]; if (p[i] > ma) ma = p[i]; }
  const m = new Float32Array(n), d = ma - mi || 1; for (let i = 0; i < n; i++) m[i] = (p[i] - mi) / d;
  return m;
}

export async function segmentar(canvas, aoProgresso) {
  const sess = await carregar(aoProgresso);
  let f = canvas; while (f.width > LADO * 2) f = metade(f);
  const c = Object.assign(document.createElement('canvas'), { width: LADO, height: LADO }), x = c.getContext('2d');
  x.imageSmoothingQuality = 'high'; x.drawImage(f, 0, 0, LADO, LADO);
  return inferir(ort, sess, x.getImageData(0, 0, LADO, LADO).data);
}

// Leva a máscara de 320 x 320 para o tamanho de trabalho (w x h) com interpolação suave.
export function ampliarMascara(m, w, h) {
  const pq = Object.assign(document.createElement('canvas'), { width: LADO, height: LADO }), px = pq.getContext('2d'), d = px.createImageData(LADO, LADO);
  for (let i = 0; i < m.length; i++) { const v = Math.round(m[i] * 255); d.data[4 * i] = d.data[4 * i + 1] = d.data[4 * i + 2] = v; d.data[4 * i + 3] = 255; }
  px.putImageData(d, 0, 0);
  const g = Object.assign(document.createElement('canvas'), { width: w, height: h }), gx = g.getContext('2d'); gx.imageSmoothingQuality = 'high'; gx.drawImage(pq, 0, 0, w, h);
  const o = gx.getImageData(0, 0, w, h).data, r = new Float32Array(w * h); for (let i = 0; i < r.length; i++) r[i] = o[4 * i] / 255;
  return r;
}
