// Fotos de perfil quadradas. As plataformas quase não publicam medidas oficiais:
// os valores abaixo vêm de guias do setor (oficial:false). Confira na plataforma antes de depender deles.
const FONTE = 'https://sproutsocial.com/insights/social-media-image-sizes/';
const QUANDO = '18/11/2026';
const P = (id, nome, px, nota) => ({ id, nome, px, nota, circulo: true, oficial: false, fonte: FONTE, verificadoEm: QUANDO });

export const PRESETS = [
  P('instagram', 'Instagram', 320, 'Sem tamanho oficial publicado: 320 px é o mais usado (a foto aparece em cerca de 110 px).'),
  P('facebook', 'Facebook', 320, 'Tamanho citado pelos guias; a foto aparece em cerca de 176 a 196 px.'),
  P('youtube', 'YouTube', 800, 'Tamanho recomendado de 800 px; os guias citam mínimo de 98 px.'),
  P('linkedin', 'LinkedIn', 400, 'Tamanho mais citado; os guias divergem sobre o mínimo (entre 200 e 400 px).'),
  P('x', 'X (Twitter)', 400, 'Tamanho mais usado pelos guias.'),
  P('tiktok', 'TikTok', 200, 'Valor de um único guia; confira no aplicativo.'),
];
