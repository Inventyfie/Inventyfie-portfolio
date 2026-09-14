import { useEffect, useState, type MouseEvent } from 'react';
import { ArrowRight, ChevronDown, ExternalLink, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Section } from './Section';
import article from '../Engineering/data/enterprise-rag-technical-knowledge.json';

type ArticleSection = (typeof article.sections)[number];

type ArticleImage = {
  src: string;
  alt: string;
  caption: string;
};

type DiagramProps = {
  diagram: NonNullable<ArticleSection['diagram']>;
};

const Diagram = ({ diagram }: DiagramProps) => (
  <div className="readable-surface my-6 rounded-2xl border border-neon-cyan/20 p-4 md:p-6">
    <div className={`grid gap-3 ${diagram.type === 'split' ? 'md:grid-cols-2' : 'md:grid-cols-4'}`}>
      {diagram.steps.map((step, index) => (
        <div key={step} className="relative rounded-xl border border-white/15 bg-white/10 p-3 text-center text-sm font-semibold text-white">
          <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-neon-cyan">{index + 1}</span>
          {step}
          {diagram.type !== 'split' && index < diagram.steps.length - 1 ? <ArrowRight className="absolute -right-4 top-1/2 z-10 hidden -translate-y-1/2 text-neon-cyan md:block" size={18} /> : null}
        </div>
      ))}
    </div>
  </div>
);

const ArticleSection = ({ section }: { section: ArticleSection }) => {
  const [isOpen, setIsOpen] = useState(section.level !== 'advanced');

  return (
    <article id={section.id} className="scroll-mt-8 border-b border-white/10 py-8 last:border-b-0">
      <button type="button" onClick={() => setIsOpen((open) => !open)} className="flex w-full items-center justify-between gap-4 text-left">
        <span>
          <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-neon-cyan">{section.level} deep dive</span>
          <span className="theme-text-primary font-display text-2xl font-bold md:text-3xl">{section.title}</span>
        </span>
        <ChevronDown className={`shrink-0 text-neon-cyan transition-transform ${isOpen ? 'rotate-180' : ''}`} size={24} />
      </button>
      {isOpen ? (
        <div className="mt-5 text-base leading-relaxed text-slate-700 dark:text-white/75">
          {section.content.map((paragraph) => <p key={paragraph} className="mb-4">{paragraph}</p>)}
          {section.image ? <ArticleImageView image={section.image} /> : null}
          {section.callouts?.map((callout) => <div key={callout} className="my-5 rounded-xl border-l-4 border-neon-cyan bg-neon-cyan/10 px-4 py-3 text-sm font-medium text-slate-800 dark:text-white/85">{callout}</div>)}
          {section.diagram ? <Diagram diagram={section.diagram} /> : null}
        </div>
      ) : null}
    </article>
  );
};

const ArticleImageView = ({ image }: { image: ArticleImage }) => (
  <figure className="my-7 overflow-hidden rounded-2xl border border-white/15 bg-black/20 shadow-xl">
    <img src={image.src} alt={image.alt} className="h-auto max-h-[34rem] w-full object-contain" loading="lazy" />
    <figcaption className="px-4 py-3 text-[18px] leading-[1.4] text-slate-600 dark:text-white/60">{image.caption}</figcaption>
  </figure>
);

const scrollToArticleSection = (event: MouseEvent<HTMLAnchorElement>, sectionId: string) => {
  event.preventDefault();
  const container = document.querySelector<HTMLElement>('[data-article-reader]');
  const target = document.getElementById(sectionId);
  if (!container || !target) {
    return;
  }

  const targetTop = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 24;
  container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
};

const PdfPreviewModal = ({ source, title, onClose }: { source: string; title: string; onClose: () => void }) => createPortal(
  <div className="fixed inset-0 z-[110] bg-black/75 p-3 backdrop-blur-md md:p-8" role="dialog" aria-modal="true" aria-label="Enterprise RAG PDF preview" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="relative h-full overflow-hidden rounded-3xl border border-white/20 bg-slate-950 shadow-2xl">
      <button type="button" onClick={onClose} className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white hover:bg-white/15" aria-label="Close PDF preview"><X size={20} /></button>
      <iframe src={source} title={title} className="h-full w-full" />
    </div>
  </div>,
  document.body,
);

export const EnterpriseRagCard = () => {
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [pdfSource, setPdfSource] = useState<{ source: string; title: string } | null>(null);

  useEffect(() => {
    if (!isReaderOpen) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsReaderOpen(false);
      }
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isReaderOpen]);

  return (
    <>
      <article className="theme-card-hover readable-surface overflow-hidden rounded-3xl border border-neon-cyan/25">
    <div className="grid md:grid-cols-[280px_minmax(0,1fr)]">
      <img src={article.heroImage.src} alt={article.heroImage.alt} className="h-full min-h-56 w-full object-cover" loading="lazy" />
      <div className="p-6 md:p-8">
        <p className="mb-2 text-xs uppercase tracking-[0.16em] text-neon-cyan">{article.category} · {article.publishedAt}</p>
        <h3 className="mb-3 font-display text-2xl font-bold text-white md:text-3xl">{article.title}</h3>
        <p className="mb-5 text-sm leading-relaxed text-white/70">{article.subtitle}</p>
        <div className="mb-6 flex flex-wrap gap-2 text-xs text-white/65">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">{article.readingTimeOverview}</span>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">{article.readingTimeDeepDive}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setIsReaderOpen(true)} className="accent-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white">Read article <ArrowRight size={16} /></button>
          <button type="button" onClick={() => setIsPdfOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"><ExternalLink size={16} /> Preview PDFs</button>
        </div>
      </div>
    </div>
      </article>
      {isReaderOpen ? createPortal(
        <div className="fixed inset-0 z-[100] bg-black/70 p-3 backdrop-blur-md md:p-8" role="dialog" aria-modal="true" aria-label="Enterprise RAG article reader" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsReaderOpen(false); }}>
          <div data-article-reader className="relative h-full overflow-y-auto rounded-3xl border border-white/20 bg-slate-950/95 shadow-2xl">
            <button type="button" onClick={() => setIsReaderOpen(false)} className="sticky right-5 top-5 z-20 ml-auto mr-5 mt-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white hover:bg-white/15" aria-label="Close article reader">
              <X size={20} />
            </button>
            <EnterpriseRagArticle onClose={() => setIsReaderOpen(false)} />
          </div>
        </div>,
        document.body,
      ) : null}
      {isPdfOpen ? createPortal(
        <div className="fixed inset-0 z-[110] bg-black/75 p-3 backdrop-blur-md md:p-8" role="dialog" aria-modal="true" aria-label="Enterprise RAG PDF choices" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsPdfOpen(false); }}>
          <div className="readable-surface relative mx-auto mt-8 max-w-2xl rounded-3xl border border-white/20 p-6 shadow-2xl md:mt-20 md:p-8">
            <button type="button" onClick={() => setIsPdfOpen(false)} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white hover:bg-white/15" aria-label="Close PDF choices"><X size={20} /></button>
            <h3 className="mb-2 pr-12 font-display text-2xl font-bold text-white">Choose a PDF to preview</h3>
            <p className="mb-6 text-sm text-white/65">Open the supplied source document or the structured reading edition.</p>
            <div className="grid gap-4 md:grid-cols-2">
              <button type="button" onClick={() => { setPdfSource({ source: article.sourcePdf, title: 'Source Enterprise RAG PDF' }); setIsPdfOpen(false); }} className="rounded-2xl border border-white/15 bg-white/10 p-5 text-left text-white hover:border-neon-cyan/60"><strong className="block text-lg">Source PDF</strong><span className="mt-2 block text-sm text-white/65">The original supplied document.</span></button>
              <button type="button" onClick={() => { setPdfSource({ source: article.readingPdf, title: 'Enterprise RAG structured reading PDF' }); setIsPdfOpen(false); }} className="rounded-2xl border border-white/15 bg-white/10 p-5 text-left text-white hover:border-neon-cyan/60"><strong className="block text-lg">Reading PDF</strong><span className="mt-2 block text-sm text-white/65">A structured edition of the web article.</span></button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
      {pdfSource ? <PdfPreviewModal source={pdfSource.source} title={pdfSource.title} onClose={() => setPdfSource(null)} /> : null}
    </>
  );
};

export const EnterpriseRagArticle = ({ onClose }: { onClose?: () => void }) => {
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [pdfSource, setPdfSource] = useState<{ source: string; title: string } | null>(null);

  return (
    <>
      <Section id="enterprise-rag-technical-knowledge" className="article-reading-text py-16 px-6">
    <div className="mx-auto max-w-7xl">
      <div className="mb-10 max-w-4xl">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-neon-cyan">Engineering / Knowledge Systems</p>
        <h2 className="theme-text-primary mb-4 font-display text-[40px] font-bold leading-[1.2]">{article.title}</h2>
        <p className="theme-text-secondary text-[22px] leading-[1.5]">{article.subtitle}</p>
        <ArticleImageView image={article.heroImage} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {onClose ? <button type="button" onClick={onClose} className="text-sm font-semibold text-neon-cyan hover:underline">← Back to Engineering topics</button> : <a href="#engineering" className="text-sm font-semibold text-neon-cyan hover:underline">← Back to Engineering topics</a>}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setIsPdfOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"><ExternalLink size={14} /> Preview PDFs</button>
            </div>
          </div>
          <article className="readable-surface article-reading-text rounded-3xl border border-neon-cyan/25 p-6 md:p-10">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-neon-cyan">At a glance</p>
            <h3 className="mb-5 font-display text-[32px] font-bold leading-[1.25] text-white">Quick Overview</h3>
            <div className="grid gap-5 md:grid-cols-2">
              <div><h4 className="mb-2 font-bold text-white">The problem</h4><p className="text-sm leading-relaxed text-white/75">{article.summary.problem}</p></div>
              <div><h4 className="mb-2 font-bold text-white">What RAG solves</h4><p className="text-sm leading-relaxed text-white/75">{article.summary.solution}</p></div>
            </div>
            <div className="my-6 rounded-2xl bg-white/10 p-4"><p className="mb-2 text-xs uppercase tracking-[0.15em] text-neon-cyan">Architecture flow</p><p className="text-sm leading-relaxed text-white/80">{article.summary.architecture.join('  ->  ')}</p></div>
            <ul className="grid gap-2 text-sm text-white/80 md:grid-cols-2">{article.summary.businessValue.map((value) => <li key={value}>✓ {value}</li>)}</ul>
            <p className="mt-5 text-sm text-white/70"><strong className="text-white">Cost note:</strong> {article.summary.cost}</p>
            <p className="mt-6 text-sm font-semibold text-neon-cyan">Want the technical details? Continue below.</p>
          </article>

          <article className="readable-surface rounded-3xl border border-white/10 px-6 md:px-10">
            <div className="mb-2 pt-8 text-xs uppercase tracking-[0.18em] text-neon-cyan">For deeper understanding</div>
            <h3 className="mb-2 font-display text-3xl font-bold text-white">Deep Dive</h3>
            <p className="pb-4 text-sm text-white/65">Open the sections relevant to your role. Advanced sections start collapsed for easier scanning.</p>
            {article.sections.map((section) => <ArticleSection key={section.id} section={section} />)}
          </article>
          <ArticleImageView image={article.humanImpactImage} />
          <div className="grid gap-8 lg:grid-cols-2">
            <article className="readable-surface rounded-3xl border border-white/10 p-6 md:p-8">
              <h3 className="mb-5 font-display text-2xl font-bold text-white">Glossary</h3>
              <div className="grid gap-4 sm:grid-cols-2">{article.glossary.map((item) => <div key={item.term}><dt className="font-bold text-neon-cyan">{item.term}</dt><dd className="mt-1 text-sm leading-relaxed text-white/70">{item.definition}</dd></div>)}</div>
            </article>
            <article className="readable-surface rounded-3xl border border-white/10 p-6 md:p-8">
              <h3 className="mb-5 font-display text-2xl font-bold text-white">Practical Tooling</h3>
              <div className="space-y-3">{article.tools.map((tool) => <div key={tool.name} className="border-b border-white/10 pb-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-white">{tool.name}</strong><span className="text-xs uppercase tracking-wider text-neon-cyan">{tool.category}</span></div><p className="mt-1 text-sm text-white/65">{tool.purpose}</p></div>)}</div>
            </article>
          </div>
          <article className="readable-surface rounded-3xl border border-neon-cyan/20 p-6 md:p-8">
            <h3 className="mb-4 font-display text-2xl font-bold text-white">Key Takeaways</h3>
            <ul className="grid gap-3 text-sm leading-relaxed text-white/75 md:grid-cols-2">{article.takeaways.map((takeaway) => <li key={takeaway}>✓ {takeaway}</li>)}</ul>
            <h4 className="mb-3 mt-8 font-display text-xl font-bold text-white">Related Topics</h4>
            <div className="flex flex-wrap gap-2">{article.relatedTopics.map((topic) => <span key={topic} className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm text-white/75">{topic}</span>)}</div>
          </article>
        </div>

        <aside data-article-contents className="h-fit max-h-[70vh] overflow-y-auto overscroll-contain lg:sticky lg:top-24">
          <div className="readable-surface rounded-2xl border border-white/10 p-5">
            <h3 className="mb-4 font-display text-lg font-bold text-white">Contents</h3>
            <nav className="space-y-2 text-sm">{article.sections.map((section) => <a key={section.id} href={`#${section.id}`} onClick={(event) => scrollToArticleSection(event, section.id)} className="block text-white/65 transition-colors duration-500 hover:text-neon-cyan">{section.title}</a>)}</nav>
          </div>
        </aside>
      </div>

    </div>
      </Section>
      {isPdfOpen ? createPortal(
        <div className="fixed inset-0 z-[110] bg-black/75 p-3 backdrop-blur-md md:p-8" role="dialog" aria-modal="true" aria-label="Enterprise RAG PDF choices" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsPdfOpen(false); }}>
          <div className="readable-surface relative mx-auto mt-8 max-w-2xl rounded-3xl border border-white/20 p-6 shadow-2xl md:mt-20 md:p-8">
            <button type="button" onClick={() => setIsPdfOpen(false)} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white hover:bg-white/15" aria-label="Close PDF choices"><X size={20} /></button>
            <h3 className="mb-2 pr-12 font-display text-2xl font-bold text-white">Choose a PDF to preview</h3>
            <p className="mb-6 text-sm text-white/65">Open the supplied source document or the structured reading edition.</p>
            <div className="grid gap-4 md:grid-cols-2">
              <button type="button" onClick={() => { setPdfSource({ source: article.sourcePdf, title: 'Source Enterprise RAG PDF' }); setIsPdfOpen(false); }} className="rounded-2xl border border-white/15 bg-white/10 p-5 text-left text-white hover:border-neon-cyan/60"><strong className="block text-lg">Source PDF</strong><span className="mt-2 block text-sm text-white/65">The original supplied document.</span></button>
              <button type="button" onClick={() => { setPdfSource({ source: article.readingPdf, title: 'Enterprise RAG structured reading PDF' }); setIsPdfOpen(false); }} className="rounded-2xl border border-white/15 bg-white/10 p-5 text-left text-white hover:border-neon-cyan/60"><strong className="block text-lg">Reading PDF</strong><span className="mt-2 block text-sm text-white/65">A structured edition of the web article.</span></button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
      {pdfSource ? <PdfPreviewModal source={pdfSource.source} title={pdfSource.title} onClose={() => setPdfSource(null)} /> : null}
    </>
  );
};
