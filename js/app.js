import { montarPerfil } from './tools/perfil.js';
import { montarFavicon } from './tools/favicon.js';
import { montarPasta } from './tools/icone-pasta.js';
import { montarSticker } from './tools/sticker.js';
import { montarAnimacao } from './tools/animacao.js';
import { montarConversor } from './tools/conversor.js';

const FERRAMENTAS = [
  { id: 'perfil', nome: 'Foto de perfil', desc: 'Redonda, quadrada ou com cantos arredondados, em vários tamanhos.', montar: montarPerfil },
  { id: 'sticker', nome: 'Sticker', desc: 'Figurinhas estáticas para WhatsApp (as animadas ficam em GIF e animação).', montar: montarSticker },
  { id: 'pasta', nome: 'Ícone de pasta', desc: 'Ícone .ico para trocar o visual de pastas do Windows.', montar: montarPasta },
  { id: 'favicon', nome: 'Favicon', desc: 'Todos os ícones que o seu site precisa.', montar: montarFavicon },
  { id: 'gif', nome: 'GIF e animação', desc: 'GIF, WebP animado e stickers animados a partir de várias imagens.', montar: montarAnimacao },
  { id: 'conversor', nome: 'Converter e otimizar', desc: '', montar: montarConversor, secundaria: true },
];
const app = document.getElementById('app'), html = document.documentElement;

try { const t = localStorage.getItem('tema'); if (t) html.dataset.tema = t; } catch {}
document.getElementById('tema').onclick = () => {
  const escuro = html.dataset.tema ? html.dataset.tema === 'escuro' : matchMedia('(prefers-color-scheme: dark)').matches;
  html.dataset.tema = escuro ? 'claro' : 'escuro';
  try { localStorage.setItem('tema', html.dataset.tema); } catch {}
};

function render() {
  const f = FERRAMENTAS.find(x => x.id === location.hash.slice(1) && x.montar);
  document.onpaste = document.onkeydown = null; app.replaceChildren();
  if (!f) {
    app.innerHTML = `<h1>Todas as ferramentas de imagem em um só lugar.</h1>
      <p class="sub">Grátis. Tudo acontece no seu navegador: suas imagens não são enviadas para ninguém.</p>
      <div class="cartoes">${FERRAMENTAS.filter(x => !x.secundaria).map(x => x.montar
        ? `<a class="cartao" href="#${x.id}"><strong>${x.nome}</strong><span class="d">${x.desc}</span></a>`
        : `<div class="cartao off" aria-disabled="true"><span class="etiq">em breve</span><strong>${x.nome}</strong><span class="d">${x.desc}</span></div>`).join('')}</div>
      <p class="sub" style="margin-top:1.4rem"><a href="#conversor">Converter e otimizar imagens em lote</a></p>`;
    return;
  }
  const cab = document.createElement('div'), corpo = document.createElement('div');
  cab.className = 'cab-ferr'; cab.innerHTML = `<a class="voltar" href="#">← Início</a><h1>${f.nome}</h1>`;
  app.append(cab, corpo); f.montar(corpo);
}
addEventListener('hashchange', render); render();
