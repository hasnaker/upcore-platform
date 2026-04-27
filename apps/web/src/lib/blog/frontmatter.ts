// Minimal, deterministik YAML frontmatter parser.
// next-mdx-remote / gray-matter bağımlılığı olmadan çalışır.
// Desteklenen tipler: string (opsiyonel tırnak), number, boolean, ISO date,
// tek satır dizisi (`[a, b]`) ve blok dizisi (`- item`).
//
// Güvenlik notu: JSON.parse ya da eval KULLANILMAZ; tamamen karakter-bazlı
// tarama yapılır. Bu sayede yazarın dikkatsizliği prod build'i patlatmaz.

export interface ParsedFrontmatter {
  data: Record<string, unknown>;
  body: string;
}

const FM_OPEN = /^---\s*\r?\n/;
const FM_CLOSE = /\r?\n---\s*(?:\r?\n|$)/;

export function parseFrontmatter(source: string): ParsedFrontmatter {
  if (!FM_OPEN.test(source)) {
    return { data: {}, body: source };
  }
  const afterOpen = source.replace(FM_OPEN, '');
  const closeMatch = FM_CLOSE.exec(afterOpen);
  if (!closeMatch) {
    return { data: {}, body: source };
  }
  const yaml = afterOpen.slice(0, closeMatch.index);
  const body = afterOpen.slice(closeMatch.index + closeMatch[0].length);
  return { data: parseYaml(yaml), body };
}

function parseYaml(yaml: string): Record<string, unknown> {
  const lines = yaml.split(/\r?\n/);
  const out: Record<string, unknown> = {};
  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i] ?? '';
    i += 1;
    const line = stripComment(rawLine);
    if (!line.trim()) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const rest = line.slice(colonIdx + 1).trim();
    if (!key) continue;
    if (rest === '' || rest === '|' || rest === '>') {
      // Blok değer: ya alt diziler ya da metin bloğu.
      const collected: string[] = [];
      while (i < lines.length) {
        const next = lines[i] ?? '';
        if (!next.startsWith('  ') && next.trim() !== '') break;
        collected.push(next);
        i += 1;
      }
      if (collected.some((l) => l.trim().startsWith('- '))) {
        out[key] = collected
          .filter((l) => l.trim().startsWith('- '))
          .map((l) => coerceScalar(l.trim().slice(2).trim()));
      } else {
        out[key] = collected.map((l) => l.replace(/^  /, '')).join('\n').trim();
      }
      continue;
    }
    out[key] = coerceScalar(rest);
  }
  return out;
}

function stripComment(line: string): string {
  // YAML comment — tırnak dışındaysa # ve sonrası çöpe atılır.
  let inSingle = false;
  let inDouble = false;
  for (let idx = 0; idx < line.length; idx += 1) {
    const ch = line[idx];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === '#' && !inSingle && !inDouble) return line.slice(0, idx);
  }
  return line;
}

function coerceScalar(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === '') return '';
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null' || trimmed === '~') return null;
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  if (/^-?\d+\.\d+$/.test(trimmed)) return Number(trimmed);
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return splitList(inner).map(coerceScalar);
  }
  return trimmed;
}

function splitList(inner: string): string[] {
  const out: string[] = [];
  let buf = '';
  let inSingle = false;
  let inDouble = false;
  for (const ch of inner) {
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      buf += ch;
    } else if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      buf += ch;
    } else if (ch === ',' && !inSingle && !inDouble) {
      out.push(buf.trim());
      buf = '';
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}
