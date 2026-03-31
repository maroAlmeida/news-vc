const fs = require('fs');

// 📁 arquivos locais
const data = require('./data.json');
const colors = require('./colors.json');
const ctas = require('./ctas.json');
const editorias = require('./editorias.json');

// 📄 html base
let html = fs.readFileSync('./template.html', 'utf-8');

// =========================
// 🔹 FUNÇÃO: gera bloco da imagem do item (com ou sem link)
// =========================
function generateImageCell(item, link) {
  const imgTag = `<img width="110" height="110" alt="{item-tit}" title="{item-tit}"
    src="{item-img}" 
    style="width:110px;height:110px;max-height:110px;max-width:110px;display:block;margin:auto;object-fit:cover;border:0;outline:none;text-decoration:none;"
  />`;

  // Se img_link for true e o link for válido (diferente de "false"), envolve com <a>
  let inner = imgTag;
  if (item.img_link === true && link !== undefined && link !== null && link !== 'false') {
    inner = `<a href="${link}" style="mso-line-height-rule:exactly;text-decoration:none;display:block">${imgTag}</a>`;
  }

  return `<td height="110px" valign="top" width="110px" align="left" style="padding:0;Margin:0">\n  ${inner}\n</td>`;
}

// =========================
// 🔹 FUNÇÃO: render itens de um tema
// =========================
function renderItens(template, itens, colorConfig) {
  return itens.map(item => {
    let bloco = template;

    // ----- 1. Substitui a célula da imagem (regex captura o bloco original) -----
    const imageCellRegex = /<td height="110px" valign="top" width="110px" align="left" style="padding:0;Margin:0">\s*<img[^>]*\/>\s*<\/td>/;
    const match = bloco.match(imageCellRegex);
    if (match) {
      const newImageCell = generateImageCell(item, item.link);
      bloco = bloco.replace(match[0], newImageCell);
    }

    // ----- 2. Substituições de conteúdo -----
    bloco = bloco.replace(/{item-img}/g, item.img || '');
    bloco = bloco.replace(/{item-tit}/g, item.tit || '');
    bloco = bloco.replace(/{item-txt}/g, item.txt || '');

    // ----- 3. CTA -----
    // CTA existe se cta != "false" e chave existe em ctas com valor não vazio
    const ctaKey = (item.cta && item.cta !== 'false') ? item.cta : null;
    const hasValidCta = ctaKey && ctas[ctaKey] && ctas[ctaKey] !== '';

    if (hasValidCta) {
      // Substitui o link e a imagem do CTA
      bloco = bloco.replace(/{item-link}/g, item.link || '#');
      bloco = bloco.replace(/{item-cta}/g, ctas[ctaKey]);
    } else {
      // Remove todo o bloco CTA
      bloco = bloco.replace(/<!-- CTA:start -->([\s\S]*?)<!-- CTA:end -->/g, '');
    }

    // ----- 4. Cores -----
    bloco = bloco.replace(/{tema-tit-color}/g, colorConfig.titColor);
    bloco = bloco.replace(/{tema-txt-color}/g, colorConfig.txtColor);

    return bloco;
  }).join('');
}

// =========================
// 🔹 FUNÇÃO: gera bloco do banner (com ou sem link)
// =========================
function generateBannerBlock(banner) {
  if (!banner) return '';

  const { img, tit, link } = banner;

  // Sem link apenas se link for a string "false"
  const hasLink = (link && link !== 'false');

  if (hasLink) {
    return `
      <tr>
        <td bgcolor="#fff" align="center" style="padding:0;Margin:0;margin:0;background-color:#fff;width:100%;max-width:600px;overflow:hidden">
          <a href="${link}" style="mso-line-height-rule:exactly;text-decoration:none;display:block;">
            <img src="${img}" title="${tit}" alt="${tit}" width="100%" style="display:block;font-size:14px;border:0;outline:none;text-decoration:none;margin:0;height:auto;width:100%;max-width:600px;" />
          </a>
        </td>
      </tr>
    `;
  } else {
    return `
      <tr>
        <td bgcolor="#fff" align="center" style="padding:0;Margin:0;margin:0;background-color:#fff;width:100%;max-width:600px;overflow:hidden">
          <img src="${img}" title="${tit}" alt="${tit}" width="100%" style="display:block;font-size:14px;border:0;outline:none;text-decoration:none;margin:0;height:auto;width:100%;max-width:600px;" />
        </td>
      </tr>
    `;
  }
}

// =========================
// 🔹 LOOP PRINCIPAL (temas)
// =========================

try {
  // Substitui placeholder do banner
  const bannerBlock = generateBannerBlock(data.banner);
  html = html.replace('{banner-block}', bannerBlock);

  // Localiza o loop dos temas
  const temaRegex = /<!-- LOOP:temas:start -->([\s\S]*?)<!-- LOOP:temas:end -->/;
  const temaMatch = html.match(temaRegex);

  if (!temaMatch) {
    throw new Error('❌ LOOP:temas não encontrado no HTML');
  }

  const temaTemplate = temaMatch[1];

  const temasRenderizados = Object.entries(data)
    .filter(([key, tema]) => tema && tema.items && !['banner', 'vigencia'].includes(key))
    .map(([temaKey, tema]) => {
      // console.log('------------------------');
      // console.log('👉 Tema:', temaKey);
      // console.log('🎨 Cor recebida:', tema.color);

      let blocoTema = temaTemplate;

      // Cor com fallback
      const colorConfig = colors[tema.color] || {
        bgColor: '#ffffff',
        titColor: '#000000',
        txtColor: '#000000'
      };

      if (!colors[tema.color]) {
        console.warn(`⚠️ Cor não encontrada: ${tema.color} (tema: ${temaKey})`);
      }

      const abaImg = editorias[tema.aba];
      if (!abaImg) {
        console.warn(`⚠️ Aba não encontrada: ${tema.aba} (tema: ${temaKey})`);
      }

      // dados do tema
      blocoTema = blocoTema.replace(/{tema-nome}/g, temaKey);
      blocoTema = blocoTema.replace(/{tema-aba}/g, abaImg || '');
      blocoTema = blocoTema.replace(/{tema-bg}/g, colorConfig.bgColor);

      // =========================
      // 🔹 LOOP DE ITENS
      // =========================

      const itensRegex = /<!-- LOOP:itens:start -->([\s\S]*?)<!-- LOOP:itens:end -->/;
      const itensMatch = blocoTema.match(itensRegex);

      if (!itensMatch) {
        console.warn(`⚠️ LOOP:itens não encontrado em ${temaKey}`);
        return blocoTema;
      }

      const itemTemplate = itensMatch[1];

      const itensHtml = renderItens(
        itemTemplate,
        tema.items || [],
        colorConfig
      );

      blocoTema = blocoTema.replace(itensRegex, itensHtml);

      return blocoTema;
    }).join('');

  html = html.replace(temaRegex, temasRenderizados);

  // =========================
  // 🔹 SUBSTITUIÇÕES GLOBAIS (banner já foi tratado)
  // =========================
  // (se houver outros placeholders globais, podem ser colocados aqui)

  // =========================
  // 💾 OUTPUT com vigência
  // =========================
  const vigencia = data.vigencia || '0000';
  fs.writeFileSync(`./NewsPraVoce-DPSP-${vigencia}.html`, html);

  console.log('✅ Build NewsPraVoce finalizado com sucesso!');

} catch (error) {
  console.error('❌ Erro no build:', error.message);
  // Opcional: mostrar stack completo para debug
  // console.error(error.stack);
}