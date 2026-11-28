// Abrir um vídeo curto e extrair quadros dele (o navegador decodifica; funciona com os formatos que ele toca, em geral MP4 H.264 e WebM).
export const LIMITE_S = 30, MAX_QUADROS = 300, MAX_MB = 500;

export function abrirVideo(arquivo, v) {
  return new Promise((ok, no) => {
    if (!arquivo.type.startsWith('video/')) return no(new Error('Esse arquivo não é um vídeo.'));
    const url = URL.createObjectURL(arquivo);
    v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.onloadedmetadata = () => (v.videoWidth && Number.isFinite(v.duration)) ? ok({ url, duracao: v.duration, w: v.videoWidth, h: v.videoHeight }) : no(new Error('Não foi possível ler as informações deste vídeo.'));
    v.onerror = () => { URL.revokeObjectURL(url); no(new Error('O navegador não consegue abrir este vídeo. Tente um MP4 (H.264) ou WebM.')); };
    v.src = url;
  });
}

// Calcula o que sai da extração: tamanho dos quadros (nunca maior que o vídeo), número de quadros e memória aproximada.
export function planejar({ ini, fim, fps, largura, w, h, duracao }) {
  const fimR = Math.min(fim, duracao), dur = fimR - ini, lw = Math.min(largura, w), lh = Math.max(1, Math.round(lw * h / w)), quadros = Math.max(1, Math.round(dur * fps));
  return { ini, fps, dur, lw, lh, quadros, mb: quadros * lw * lh * 4 / 1048576 };
}
export function validar(p) {
  if (!(p.dur > 0)) return 'O fim precisa ser depois do início.';
  if (p.dur > LIMITE_S) return `O trecho tem ${p.dur.toFixed(1)} s; o limite é ${LIMITE_S} s.`;
  if (p.quadros > MAX_QUADROS) return `Seriam ${p.quadros} quadros; o limite é ${MAX_QUADROS}. Diminua o trecho ou os quadros por segundo.`;
  if (p.mb > MAX_MB) return `Os quadros ocupariam cerca de ${Math.round(p.mb)} MB de memória (limite ${MAX_MB} MB). Diminua a largura.`;
  return '';
}

function buscar(v, t) {
  return new Promise((ok, no) => {
    if (Math.abs(v.currentTime - t) < 0.001 && v.readyState >= 2) return ok();
    const aoBuscar = () => { clearTimeout(tm); v.removeEventListener('seeked', aoBuscar); ok(); };
    const tm = setTimeout(() => { v.removeEventListener('seeked', aoBuscar); no(new Error('O vídeo demorou demais para responder.')); }, 8000);
    v.addEventListener('seeked', aoBuscar); v.currentTime = t;
  });
}

// Percorre o trecho no tempo escolhido, um quadro a cada 1/fps segundo.
export async function extrairQuadros(v, p, { aoProgresso, cancelado } = {}) {
  const q = [], ms = Math.round(1000 / p.fps); v.pause();
  for (let k = 0; k < p.quadros; k++) {
    if (cancelado?.()) throw new Error('Cancelado.');
    await buscar(v, Math.min(p.ini + k / p.fps, Math.max(0, v.duration - 0.01)));
    const c = Object.assign(document.createElement('canvas'), { width: p.lw, height: p.lh }), x = c.getContext('2d');
    x.imageSmoothingQuality = 'high'; x.drawImage(v, 0, 0, p.lw, p.lh); q.push({ img: c, ms }); aoProgresso?.(k + 1, p.quadros);
  }
  return q;
}
