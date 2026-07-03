import type { SiteConfig } from "./site-config-types";
import { getImageIndexFromSeed, getImageUrl } from "./site-images";

export function getSeoImageIndices(
  seed: string,
  config: SiteConfig,
  count = 3
): number[] {
  const max = Math.max(1, config.imageCount);
  const base = getImageIndexFromSeed(seed, config);
  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    indices.push(((base - 1 + i * 7) % max) + 1);
  }
  return indices;
}

function buildSeoImageFigure(url: string, alt: string): string {
  return `<figure class="seo-content-image"><img src="${url}" alt="${alt.replace(/"/g, "&quot;")}" loading="lazy" width="800" height="500" /><figcaption>${alt} 시공 사례</figcaption></figure>`;
}

function injectImagesIntoContent(
  content: string,
  keyword: string,
  urls: string[]
): string {
  const parts = content.split(/(<\/h2>)/i);
  let imgIdx = 0;
  let output = "";
  let h2Count = 0;

  for (const part of parts) {
    output += part;
    if (part.toLowerCase() === "</h2>") {
      h2Count++;
      if (h2Count % 2 === 1 && imgIdx < urls.length) {
        output += buildSeoImageFigure(urls[imgIdx], `${keyword} 현장 사진`);
        imgIdx++;
      }
    }
  }

  if (imgIdx === 0 && urls.length > 0) {
    output += '<div class="seo-image-gallery">';
    for (let i = 0; i < urls.length; i++) {
      output += buildSeoImageFigure(urls[i], `${keyword} 시공 사례 ${i + 1}`);
    }
    output += "</div>";
  }

  return output;
}

/** 본문 토큰 {{image1}}~{{image3}} 치환 또는 h2 사이 자동 삽입 */
export function enrichSeoContentWithImages(
  content: string,
  keyword: string,
  config: SiteConfig,
  seed: string
): string {
  const urls = getSeoImageIndices(seed, config, 3).map((idx) =>
    getImageUrl(idx, config)
  );

  let result = content;
  urls.forEach((url, i) => {
    const token = `{{image${i + 1}}}`;
    const figure = buildSeoImageFigure(url, `${keyword} 시공 사례 ${i + 1}`);
    result = result.split(token).join(figure);
  });

  if (!result.includes("seo-content-image")) {
    result = injectImagesIntoContent(result, keyword, urls);
  }

  return result;
}
