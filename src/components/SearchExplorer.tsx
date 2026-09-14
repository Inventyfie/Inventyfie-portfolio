import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CmsEntry, ContentMetadata } from '../data/platformContent';
import { MetadataStrip } from './MetadataStrip';

export interface SearchDocument {
  id: string;
  kind: string;
  title: string;
  summary: string;
  sectionHref: string;
  metadata: ContentMetadata;
  searchableContent: string;
}

interface SearchExplorerProps {
  docs: SearchDocument[];
  cmsEntries: CmsEntry[];
}

const scoreDocument = (queryTerms: string[], doc: SearchDocument) => {
  const haystack = `${doc.title} ${doc.summary} ${doc.searchableContent} ${doc.metadata.tags.join(' ')}`.toLowerCase();
  let score = 0;

  for (const term of queryTerms) {
    if (doc.title.toLowerCase().includes(term)) {
      score += 5;
    }
    if (doc.summary.toLowerCase().includes(term)) {
      score += 3;
    }
    if (doc.metadata.tags.join(' ').toLowerCase().includes(term)) {
      score += 2;
    }
    if (haystack.includes(term)) {
      score += 1;
    }
  }

  return score;
};

export const SearchExplorer = ({ docs, cmsEntries }: SearchExplorerProps) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');

  const filters = useMemo(() => {
    const kinds = Array.from(new Set(docs.map((doc) => doc.kind))).sort();
    return ['All', ...kinds];
  }, [docs]);

  const results = useMemo(() => {
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .map((term) => term.trim())
      .filter(Boolean);

    const filtered = docs.filter((doc) => (filter === 'All' ? true : doc.kind === filter));

    if (!terms.length) {
      return filtered.slice(0, 8);
    }

    return filtered
      .map((doc) => ({ doc, score: scoreDocument(terms, doc) }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((result) => result.doc);
  }, [docs, filter, query]);

  return (
    <div className="glass readable-surface section-panel rounded-3xl border border-white/10 p-6 md:p-8">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Intelligent Search</h3>
        <div className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-white/45">
          Indexed sources: {docs.length} · CMS entries: {cmsEntries.length}
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
          <Search size={16} className="text-neon-cyan" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search research, tutorials, engineering, case studies, and admin content"
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none dark:text-white dark:placeholder:text-white/45"
          />
        </label>

        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-900 focus:outline-none dark:text-white"
        >
          {filters.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {results.map((result) => (
          <article key={result.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[10px] uppercase tracking-[0.16em] text-neon-cyan">{result.kind}</span>
              <a href={result.sectionHref} className="text-xs text-neon-cyan hover:underline">
                Open section
              </a>
            </div>
            <h4 className="mb-2 font-display text-lg font-semibold text-slate-900 dark:text-white">{result.title}</h4>
            <p className="mb-3 text-sm text-slate-700 dark:text-white/65">{result.summary}</p>
            <MetadataStrip metadata={result.metadata} />
          </article>
        ))}
      </div>
    </div>
  );
};
