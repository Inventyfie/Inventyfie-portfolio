import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Check, ChevronDown, Copy, ExternalLink, Sparkles, X, Sliders } from 'lucide-react';
import lessonMarkdown from '../Tutorials/data/llm-temperature-article.md?raw';
import { SamplingPlaygroundModal } from './playground/SamplingPlaygroundModal';

type DeepDiveSection = { id: string; title: string; content: string };

const ARTICLE = {
  slug: 'llm-temperature',
  title: 'How AI Chooses Its Next Word: Temperature, Top-k and Top-p',
  subtitle: 'Follow an animated experiment to discover how AI turns scores into chances - and how three settings change which token gets picked.',
  hero: '/images/tutorials/llm-temperature/hero.png',
  video: '/tpk_lab_explained.mp4',
  captions: '/tpk_lab_captions.vtt',
};

const inline = (text: string): ReactNode[] =>
  text
    .split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^\)]+\))/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      const link = part.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
      if (link) {
        return (
          <a
            key={index}
            href={link[2]}
            target="_blank"
            rel="noreferrer"
            className="text-neon-cyan underline underline-offset-4"
          >
            {link[1]}
          </a>
        );
      }
      return part;
    });

const parseTable = (lines: string[]) => {
  const row = (line: string) => line.split('|').slice(1, -1).map((cell) => cell.trim());
  return { headers: row(lines[0]), rows: lines.slice(2).map(row) };
};

const MarkdownBlocks = ({ markdown }: { markdown: string }) => {
  const lines = markdown.trim().split('\n');
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) {
        code.push(lines[index++]);
      }
      index += 1;
      blocks.push(
        <pre
          key={blocks.length}
          className="my-5 overflow-x-auto rounded-xl border border-white/15 bg-black/35 p-4 text-sm leading-relaxed text-white/85"
        >
          <code>{code.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    const image = line.match(/^!\[([^\]]*)\]\(([^\)]+)\)$/);
    if (image) {
      let nextIndex = index + 1;
      while (nextIndex < lines.length && !lines[nextIndex].trim()) {
        nextIndex += 1;
      }
      const captionLine = lines[nextIndex]?.trim().match(/^\*(.+)\*$/);
      index = captionLine ? nextIndex + 1 : nextIndex;
      blocks.push(
        <figure
          key={blocks.length}
          className="my-7 overflow-hidden rounded-2xl border border-white/15 bg-black/25 shadow-xl"
        >
          <a
            href={image[2]}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${image[1]} in a new tab`}
          >
            <img
              src={image[2]}
              alt={image[1]}
              className="h-auto max-h-[38rem] w-full object-contain"
              loading="lazy"
            />
          </a>
          {captionLine ? (
            <figcaption className="border-t border-white/10 px-4 py-3 text-sm leading-relaxed text-white/70">
              {captionLine[1]}
            </figcaption>
          ) : null}
        </figure>,
      );
      continue;
    }

    if (line.startsWith('|') && lines[index + 1]?.includes('---')) {
      const tableLines: string[] = [];
      while (index < lines.length && lines[index].startsWith('|')) {
        tableLines.push(lines[index++]);
      }
      const table = parseTable(tableLines);
      blocks.push(
        <div key={blocks.length} className="my-6 overflow-x-auto rounded-xl border border-white/15">
          <table className="min-w-[42rem] w-full text-left text-sm">
            <thead className="bg-white/10 text-white">
              <tr>
                {table.headers.map((header) => (
                  <th key={header} className="px-4 py-3 font-semibold">
                    {inline(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-white/75">
              {table.rows.map((cells, rowIndex) => (
                <tr key={rowIndex} className="border-t border-white/10">
                  {cells.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-3 align-top leading-relaxed">
                      {inline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (line.startsWith('> ')) {
      const quote: string[] = [];
      while (index < lines.length && lines[index].startsWith('> ')) {
        quote.push(lines[index++].slice(2));
      }
      blocks.push(
        <aside
          key={blocks.length}
          className="my-5 rounded-xl border-l-4 border-neon-cyan bg-neon-cyan/10 px-4 py-3 text-sm leading-relaxed text-white/85"
        >
          {inline(quote.join(' '))}
        </aside>,
      );
      continue;
    }

    if (/^[-*] /.test(line) || /^\d+\. /.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const items: string[] = [];
      while (
        index < lines.length &&
        (ordered ? /^\d+\. /.test(lines[index]) : /^[-*] /.test(lines[index]))
      ) {
        items.push(lines[index++].replace(ordered ? /^\d+\. / : /^[-*] /, ''));
      }
      const List = ordered ? 'ol' : 'ul';
      blocks.push(
        <List
          key={blocks.length}
          className={`my-5 space-y-2 pl-6 text-white/80 ${
            ordered ? 'list-decimal' : 'list-disc'
          }`}
        >
          {items.map((item) => (
            <li key={item} className="leading-relaxed">
              {inline(item)}
            </li>
          ))}
        </List>,
      );
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push(
        <h4 key={blocks.length} className="mt-8 mb-3 font-display text-xl font-bold text-white">
          {inline(line.slice(4))}
        </h4>,
      );
      index += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      blocks.push(
        <h3 key={blocks.length} className="mt-8 mb-4 font-display text-2xl font-bold text-white">
          {inline(line.slice(3))}
        </h3>,
      );
      index += 1;
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].startsWith('```') &&
      !lines[index].startsWith('![') &&
      !lines[index].startsWith('|') &&
      !lines[index].startsWith('> ') &&
      !/^[-*] /.test(lines[index]) &&
      !/^\d+\. /.test(lines[index]) &&
      !lines[index].startsWith('## ')
    ) {
      paragraph.push(lines[index++]);
    }
    blocks.push(
      <p key={blocks.length} className="mb-4 text-base leading-relaxed text-white/80">
        {inline(paragraph.join(' '))}
      </p>,
    );
  }
  return <>{blocks}</>;
};

const articleBody = lessonMarkdown.replace(/^---[\s\S]*?---\s*/, '').replace(/^# .+\n+/, '');
const [overviewSource = '', deepDiveSource = ''] = articleBody.split('\n# Deep Dive\n');
const overview = overviewSource.replace(/^## At a Glance\s*/, '');
const deepDiveSections: DeepDiveSection[] = deepDiveSource
  .split('\n## ')
  .filter(Boolean)
  .map((section, index) => {
    const [title, ...content] = section.split('\n');
    return {
      id: `temperature-deep-dive-${index + 1}`,
      title,
      content: content.join('\n'),
    };
  });

const ShareButton = () => {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const link = `${window.location.origin}${window.location.pathname}#tutorial/${ARTICLE.slug}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy this tutorial link:', link);
    }
  };
  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15"
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? 'Link copied' : 'Share'}
    </button>
  );
};

const PdfPreview = ({ onClose }: { onClose: () => void }) =>
  createPortal(
    <div
      className="fixed inset-0 z-[110] bg-black/75 p-3 backdrop-blur-md md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial PDF preview"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative h-full overflow-hidden rounded-3xl border border-white/20 bg-slate-950 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white hover:bg-white/15"
          aria-label="Close PDF preview"
        >
          <X size={20} />
        </button>
        <iframe
          src="/llm-temperature-tutorial.pdf"
          title="How AI Chooses Its Next Word tutorial PDF"
          className="h-full w-full"
        />
      </div>
    </div>,
    document.body,
  );

const DeepDiveItem = ({ section, index }: { section: DeepDiveSection; index: number }) => {
  const [open, setOpen] = useState(index < 3);
  return (
    <article id={section.id} className="scroll-mt-8 border-b border-white/10 py-7 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="font-display text-xl font-bold text-white md:text-2xl">
          {section.title}
        </span>
        <ChevronDown
          size={22}
          className={`shrink-0 text-neon-cyan transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? (
        <div className="mt-5">
          <MarkdownBlocks markdown={section.content} />
        </div>
      ) : null}
    </article>
  );
};

export const TemperatureTutorialCard = ({ isSelected = false }: { isSelected?: boolean }) => {
  const [open, setOpen] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // Only close reader if playground overlay is not open
      if (event.key === 'Escape' && !isPlaygroundOpen) {
        close();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, isPlaygroundOpen]);

  return (
    <>
      <article
        id={`tutorial-${ARTICLE.slug}`}
        className={`theme-card-hover readable-surface overflow-hidden rounded-3xl border p-6 md:p-8 ${
          isSelected
            ? 'border-neon-cyan ring-2 ring-neon-cyan/50 shadow-[0_0_35px_rgba(0,242,255,0.3)]'
            : 'border-neon-cyan/25'
        }`}
      >
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(18rem,38%)] md:items-center">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.16em] text-neon-cyan font-semibold">
              Interactive Tutorial & Lab
            </p>
            <h3 className="mb-3 font-display text-2xl font-bold text-white md:text-3xl">
              {ARTICLE.title}
            </h3>
            <p className="mb-5 text-base leading-relaxed text-white/75">{ARTICLE.subtitle}</p>

            <div className="mb-6 flex flex-wrap gap-2 text-xs text-white/65">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                3 min overview
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                10 min deep dive
              </span>
              <span className="rounded-full border border-neon-cyan/30 bg-neon-cyan/10 px-3 py-1 text-neon-cyan font-medium">
                Interactive Playground
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen(true)}
                className="accent-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white"
              >
                Read tutorial <ArrowRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => setIsPlaygroundOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-neon-cyan/40 bg-neon-cyan/20 px-5 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(0,242,255,0.25)] hover:bg-neon-cyan/30 transition-all hover:scale-[1.02]"
              >
                <Sparkles size={16} className="text-neon-cyan animate-pulse" />
                Open Interactive Playground
              </button>

              <ShareButton />

              <button
                type="button"
                onClick={() => setIsPdfOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
              >
                <ExternalLink size={16} />
                Preview PDF
              </button>
            </div>
          </div>

          <div className="relative group">
            <img
              src={ARTICLE.hero}
              alt="Three controls labelled temperature, top-k and top-p"
              className="h-auto w-full rounded-2xl border border-white/10 object-contain shadow-2xl transition-transform group-hover:scale-[1.01]"
            />
            <button
              type="button"
              onClick={() => setIsPlaygroundOpen(true)}
              className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-neon-cyan px-4 py-2 text-xs font-bold text-slate-950 shadow-xl">
                <Sliders size={15} /> Launch Simulator
              </span>
            </button>
          </div>
        </div>
      </article>

      {/* Full Article Reader Modal */}
      {open ? (
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black/75 p-3 backdrop-blur-md md:p-8"
            role="dialog"
            aria-modal="true"
            aria-label="Temperature tutorial reader"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <div
              data-temperature-reader
              className="relative h-full overflow-y-auto rounded-3xl border border-white/20 bg-slate-950/95 shadow-2xl"
            >
              {/* Header Actions */}
              <div className="sticky right-5 top-5 z-20 ml-auto mr-5 mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlaygroundOpen(true)}
                  className="accent-button inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple px-4 py-2 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105"
                >
                  <Sparkles size={14} /> Open Interactive Playground
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white hover:bg-white/15"
                  aria-label="Close tutorial reader"
                >
                  <X size={20} />
                </button>
              </div>

              <main className="mx-auto max-w-7xl px-6 pb-16">
                <header className="mx-auto max-w-4xl pt-4">
                  <p className="mb-3 text-xs uppercase tracking-[0.2em] text-neon-cyan">
                    Tutorial / AI Fundamentals
                  </p>
                  <h1 className="mb-4 font-display text-4xl font-bold leading-tight text-white md:text-6xl">
                    {ARTICLE.title}
                  </h1>
                  <p className="text-xl leading-relaxed text-white/75">{ARTICLE.subtitle}</p>

                  {/* Interactive Playground Banner inside Article Reader */}
                  <div className="mt-8 overflow-hidden rounded-3xl border border-neon-cyan/40 bg-gradient-to-r from-neon-cyan/15 via-black/40 to-neon-purple/20 p-6 md:p-8 shadow-[0_0_35px_rgba(0,242,255,0.15)]">
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-1 text-xs font-bold text-neon-cyan">
                          <Sparkles size={14} /> Hands-on Laboratory
                        </div>
                        <h3 className="font-display text-2xl font-bold text-white">
                          Interactive Next-Token Sampling Playground
                        </h3>
                        <p className="text-sm leading-relaxed text-white/80">
                          Experiment with Temperature, Top-k, and Top-p sliders in real time using the dragon prompt “The dragon breathed…”. Spin the probability lottery wheel, inspect step-by-step math, and test your predictions!
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPlaygroundOpen(true)}
                        className="accent-button shrink-0 inline-flex items-center gap-2 rounded-2xl bg-neon-cyan px-6 py-3.5 text-sm font-bold text-slate-950 shadow-[0_0_25px_rgba(0,242,255,0.4)] transition-all hover:scale-105 active:scale-95"
                      >
                        <Sliders size={18} /> Open Interactive Playground
                      </button>
                    </div>
                  </div>

                  <figure className="mt-8 overflow-hidden rounded-3xl border border-white/15 bg-black/25">
                    <img
                      src={ARTICLE.hero}
                      alt="Three controls labelled temperature, top-k and top-p"
                      className="h-auto w-full object-contain"
                    />
                    <figcaption className="border-t border-white/10 px-4 py-3 text-sm text-white/70">
                      Three controls, three different jobs: reshape the chances, limit the candidate count, and set a probability target.
                    </figcaption>
                  </figure>

                  <div className="mt-8">
                    <video
                      controls
                      playsInline
                      preload="metadata"
                      poster={ARTICLE.hero}
                      className="w-full rounded-3xl border border-white/15 bg-black"
                    >
                      <source src={ARTICLE.video} type="video/mp4" />
                      <track
                        kind="captions"
                        src={ARTICLE.captions}
                        srcLang="en"
                        label="English"
                        default
                      />
                      Your browser does not support the video tag.
                    </video>
                    <p className="mt-3 text-sm text-white/70">
                      Watch the animation, pause when you need to, and explore each example at your own pace.
                    </p>
                  </div>
                </header>

                <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_20rem]">
                  <div>
                    <section aria-label="At a glance" className="readable-surface mb-12 rounded-3xl border border-white/15 p-6 md:p-8">
                      <h2 className="mb-6 font-display text-3xl font-bold text-white">At a Glance</h2>
                      <MarkdownBlocks markdown={overview} />
                    </section>

                    <section aria-label="Deep dive" className="readable-surface rounded-3xl border border-white/15 p-6 md:p-8">
                      <h2 className="mb-6 font-display text-3xl font-bold text-white">Deep Dive</h2>
                      <div className="divide-y divide-white/10">
                        {deepDiveSections.map((section, index) => (
                          <DeepDiveItem key={section.id} section={section} index={index} />
                        ))}
                      </div>
                    </section>
                  </div>

                  {/* Sidebar Navigation */}
                  <aside className="space-y-6">
                    <div className="sticky top-20 rounded-3xl border border-white/15 bg-black/40 p-6 backdrop-blur-md">
                      <h3 className="mb-4 font-display text-lg font-bold text-white">Interactive Tools</h3>
                      <button
                        type="button"
                        onClick={() => setIsPlaygroundOpen(true)}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-neon-cyan to-emerald-400 p-3 text-xs font-bold text-slate-950 shadow-lg hover:opacity-90 transition-opacity"
                      >
                        <Sparkles size={16} /> Open Interactive Playground
                      </button>

                      <hr className="my-6 border-white/10" />

                      <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-neon-cyan">
                        Table of Contents
                      </h4>
                      <nav className="space-y-2 text-xs text-white/70">
                        <a
                          href="#tutorial-llm-temperature"
                          className="block hover:text-white transition-colors"
                        >
                          • At a Glance
                        </a>
                        {deepDiveSections.map((sec) => (
                          <a
                            key={sec.id}
                            href={`#${sec.id}`}
                            className="block hover:text-white transition-colors truncate"
                          >
                            • {sec.title}
                          </a>
                        ))}
                      </nav>
                    </div>
                  </aside>
                </div>
              </main>
            </div>
          </div>,
          document.body,
        )
      ) : null}

      {/* Interactive Sampling Playground Modal Overlay */}
      {isPlaygroundOpen ? (
        <SamplingPlaygroundModal
          isOpen={isPlaygroundOpen}
          onClose={() => setIsPlaygroundOpen(false)}
        />
      ) : null}

      {/* PDF Preview Modal */}
      {isPdfOpen ? <PdfPreview onClose={() => setIsPdfOpen(false)} /> : null}
    </>
  );
};
