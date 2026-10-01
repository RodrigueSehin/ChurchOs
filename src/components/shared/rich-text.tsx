import * as React from "react";

/**
 * Rendu sûr de la mise en forme légère des annonces : **gras**, _italique_, ++souligné++, liens
 * `[texte](https://…)` et listes `- `. Tout est construit en éléments React (aucun HTML brut) : le
 * texte saisi ne peut donc pas injecter de balise ; seuls les liens http(s) sont acceptés.
 */
const INLINE = /(\*\*[^*]+\*\*|\+\+[^+]+\+\+|(?<![\w])_[^_]+_(?![\w])|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("++") && part.endsWith("++") && part.length > 4) return <u key={key}>{part.slice(2, -2)}</u>;
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>;
    const link = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(part);
    if (link) {
      return (
        <a key={key} href={link[2]} target="_blank" rel="noopener noreferrer" className="text-primary underline">
          {link[1]}
        </a>
      );
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flushList = () => {
    if (list.length === 0) return;
    const items = list;
    list = [];
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="my-1 list-disc pl-5">
        {items.map((item, i) => (
          <li key={i}>{renderInline(item, `li-${blocks.length}-${i}`)}</li>
        ))}
      </ul>,
    );
  };

  text.split("\n").forEach((line, index) => {
    const bullet = /^[-*] (.*)$/.exec(line);
    if (bullet) {
      list.push(bullet[1]!);
      return;
    }
    flushList();
    blocks.push(
      line.trim() === "" ? (
        <div key={`sp-${index}`} className="h-2" />
      ) : (
        <p key={`p-${index}`}>{renderInline(line, `p-${index}`)}</p>
      ),
    );
  });
  flushList();

  return <div className={className}>{blocks}</div>;
}
