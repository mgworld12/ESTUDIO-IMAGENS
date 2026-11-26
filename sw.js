// sw.js — uso offline. Mude VERSAO a cada publicação para que os arquivos guardados sejam atualizados.
const VERSAO = 'image-studio-v1.0.0';
const ARQUIVOS = [
  './',
  'index.html',
  'css/base.css',
  'favicon.ico',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'js/app.js',
  'js/core/imagem.js',
  'js/core/quadro.js',
  'js/core/recorte.js',
  'js/data/presets-redes.js',
  'js/services/animados.js',
  'js/services/exportar.js',
  'js/services/fundo.js',
  'js/services/gif.js',
  'js/services/ico.js',
  'js/services/mascara.js',
  'js/services/sticker-anim.js',
  'js/services/webp-anim.js',
  'js/tools/animacao.js',
  'js/tools/conversor.js',
  'js/tools/favicon.js',
  'js/tools/fundo.js',
  'js/tools/icone-pasta.js',
  'js/tools/perfil.js',
  'js/tools/sticker.js',
  'js/utils/avisar.js',
  'manifest.webmanifest',
  'vendor/gifenc.esm.js',
  'vendor/ort/ort-wasm-simd-threaded.mjs',
  'vendor/ort/ort.wasm.min.mjs'
];

self.addEventListener('install', e => e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('image-studio-v') && k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim())));

// Rede primeiro (para as atualizações aparecerem), com o que está guardado como reserva quando não há internet.
// O motor e o modelo de IA (.wasm e /modelos/) ficam de fora: o próprio site os guarda quando você usa "Remover fundo".
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || /\.wasm$|\/modelos\/|teste\.html$/.test(u.pathname)) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSAO), guardado = await cache.match(e.request);
    try {
      const ctl = new AbortController(), t = guardado ? setTimeout(() => ctl.abort(), 4000) : 0;
      const r = await fetch(e.request, { signal: ctl.signal }); clearTimeout(t);
      if (r.ok) cache.put(e.request, r.clone());
      return r;
    } catch {
      return guardado || (e.request.mode === 'navigate' ? await cache.match('index.html') : null) || Response.error();
    }
  })());
});
