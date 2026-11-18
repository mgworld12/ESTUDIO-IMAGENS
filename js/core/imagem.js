import { avisar } from '../utils/avisar.js';
const LIMITE = 50 * 1024 * 1024;

// Abre a imagem respeitando a orientação EXIF (fotos de celular). SVG usa caminho próprio.
export async function abrirArquivo(f) {
  if (!f || !f.type.startsWith('image/')) throw new Error('Esse arquivo não é uma imagem. Use PNG, JPG, WebP, GIF, BMP ou SVG.');
  if (f.size > LIMITE) throw new Error('Imagem maior que 50 MB. Reduza o arquivo e tente de novo.');
  try { if (f.type !== 'image/svg+xml') return await createImageBitmap(f, { imageOrientation: 'from-image' }); } catch {}
  const url = URL.createObjectURL(f);
  try {
    const img = new Image(); img.src = url; await img.decode();
    const w = img.naturalWidth || 1024, h = img.naturalHeight || 1024;
    const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
    c.getContext('2d').drawImage(img, 0, 0, w, h); return c;
  } catch { throw new Error('Não foi possível abrir essa imagem. Ela pode estar corrompida.'); }
  finally { URL.revokeObjectURL(url); }
}

// Seleção, arrastar e soltar e Ctrl+V. Seleção vem dos inputs; o resto, da zona.
export function ligarEntrada(zona, inputs, aoReceber) {
  const receber = async f => { try { aoReceber(await abrirArquivo(f)); } catch (e) { avisar(e.message, 'erro'); } };
  inputs.forEach(i => i.onchange = () => { if (i.files[0]) receber(i.files[0]); i.value = ''; });
  zona.ondragover = e => { e.preventDefault(); zona.classList.add('sobre'); };
  zona.ondragleave = () => zona.classList.remove('sobre');
  zona.ondrop = e => { e.preventDefault(); zona.classList.remove('sobre'); const f = e.dataTransfer.files[0]; if (f) receber(f); };
  document.onpaste = e => { const f = [...(e.clipboardData?.files || [])][0]; if (f) receber(f); };
}

// Reduz à metade com suavização: evita serrilhado ao encolher fotos grandes.
export function metade(f) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, f.width >> 1); c.height = Math.max(1, f.height >> 1);
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(f, 0, 0, c.width, c.height); return c;
}
