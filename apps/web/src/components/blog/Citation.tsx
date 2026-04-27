interface CitationProps {
  author: string;
  year: string;
  title: string;
  journal?: string;
  doi?: string;
  url?: string;
}

// APA 7 formatına yakın minimal akademik atıf bloğu.
// Güven + E-E-A-T sinyali olarak kullanılır.
export function Citation({ author, year, title, journal, doi, url }: CitationProps) {
  const href = doi ? `https://doi.org/${doi}` : url;
  return (
    <cite
      className="my-6 block border-l-2 border-[#D1D5DB] bg-[#F9FAFB] px-4 py-3 text-xs not-italic text-[#4B5563]"
      data-citation
    >
      <span className="font-semibold text-[#0F1419]">{author}</span>{' '}
      <span>({year}).</span>{' '}
      <span className="italic">{title}</span>
      {journal ? <span>, {journal}</span> : null}
      {doi ? (
        <>
          .{' '}
          <a
            href={`https://doi.org/${doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#FF5400] underline"
          >
            doi:{doi}
          </a>
        </>
      ) : url ? (
        <>
          .{' '}
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#FF5400] underline"
          >
            Kaynak
          </a>
        </>
      ) : null}
    </cite>
  );
}
