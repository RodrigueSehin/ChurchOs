import "server-only";
import mammoth from "mammoth";
import sanitizeHtml from "sanitize-html";

/** Convertit un DOCX en HTML sûr pour l'affichage : mammoth produit un HTML sémantique (titres,
 * paragraphes, listes, tableaux, images en data-URI) qui est ensuite filtré par liste blanche —
 * aucun script, style en ligne ni lien `javascript:` ne peut survivre. */
export async function docxToHtml(buffer: Buffer) {
  const { value, messages } = await mammoth.convertToHtml({ buffer });
  const html = sanitizeHtml(value, {
    allowedTags: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "strong", "em", "u", "s", "sub", "sup", "ul", "ol", "li", "table", "thead", "tbody", "tr", "td", "th", "img", "a", "blockquote"],
    allowedAttributes: { a: ["href"], img: ["src", "alt"], td: ["colspan", "rowspan"], th: ["colspan", "rowspan"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["data"] },
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }) },
  });
  return { html, warnings: messages.length };
}
