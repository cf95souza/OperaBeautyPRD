import { useEffect } from 'react';

/**
 * Hook para atualização dinâmica de Meta Tags de SEO, Social Share (Open Graph / Twitter Card) e Schema.org JSON-LD
 * Atende aos itens D20, F1 e F3 do Plano de Melhorias.
 * 
 * @param {Object} seoConfig
 * @param {string} [seoConfig.title] - Título da página (og:title / title)
 * @param {string} [seoConfig.description] - Descrição para buscadores e redes (og:description / description)
 * @param {string} [seoConfig.image] - Imagem de prévia ao compartilhar no WhatsApp/Redes (og:image)
 * @param {string} [seoConfig.url] - URL canônica da página (og:url)
 * @param {string} [seoConfig.canonical] - Link canônico explícito (ex.: https://operabeauty.com.br/)
 * @param {Object|Array} [seoConfig.jsonLd] - Dados estruturados JSON-LD para Schema.org
 */
export const useSEO = ({ title, description, image, url, canonical, jsonLd }) => {
  useEffect(() => {
    if (!title && !description && !jsonLd) return;

    const previousTitle = document.title;
    if (title) {
      document.title = title;
    }

    const setMetaTag = (attributeName, attributeValue, content) => {
      if (!content) return;
      let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attributeName, attributeValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Meta padrão
    if (description) {
      setMetaTag('name', 'description', description);
    }

    // Open Graph (WhatsApp, Facebook, LinkedIn, Telegram)
    if (title) setMetaTag('property', 'og:title', title);
    if (description) setMetaTag('property', 'og:description', description);
    if (image) setMetaTag('property', 'og:image', image);
    if (url) setMetaTag('property', 'og:url', url.startsWith('http') ? url : window.location.origin + url);
    setMetaTag('property', 'og:type', 'website');

    // Twitter Card
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    if (title) setMetaTag('name', 'twitter:title', title);
    if (description) setMetaTag('name', 'twitter:description', description);
    if (image) setMetaTag('name', 'twitter:image', image);

    // Canonical Link
    const targetCanonical = canonical || (url ? (url.startsWith('http') ? url : window.location.origin + url) : null);
    let canonicalElement = null;
    if (targetCanonical) {
      canonicalElement = document.querySelector('link[rel="canonical"]');
      if (!canonicalElement) {
        canonicalElement = document.createElement('link');
        canonicalElement.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalElement);
      }
      canonicalElement.setAttribute('href', targetCanonical);
    }

    // JSON-LD Structured Data (Schema.org)
    let jsonLdScript = null;
    if (jsonLd) {
      const scriptId = 'seo-structured-data';
      jsonLdScript = document.getElementById(scriptId);
      if (!jsonLdScript) {
        jsonLdScript = document.createElement('script');
        jsonLdScript.setAttribute('type', 'application/ld+json');
        jsonLdScript.setAttribute('id', scriptId);
        document.head.appendChild(jsonLdScript);
      }
      jsonLdScript.textContent = JSON.stringify(jsonLd);
    }

    return () => {
      document.title = previousTitle;
      if (jsonLdScript && jsonLdScript.parentNode) {
        jsonLdScript.parentNode.removeChild(jsonLdScript);
      }
    };
  }, [title, description, image, url, canonical, jsonLd]);
};

export default useSEO;

