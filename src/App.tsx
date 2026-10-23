/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createPortal } from 'react-dom';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Brain,
  Check,
  Copy,
  Cpu,
  Github,
  Linkedin,
  Mail,
  Twitter,
  X,
  Zap,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Section } from './components/Section';
import { ThemeProvider } from './contexts/ThemeContext';
import {
  ABOUT_CONTENT,
  CASE_STUDIES,
  CASE_STUDY_INDUSTRIES,
  CmsEntry,
  ENGINEERING_PROJECTS,
  NAV_LINKS,
  RESEARCH_INVESTIGATIONS,
  TUTORIAL_ARTICLES,
  TutorialArticle,
} from './data/platformContent';
import { MetadataStrip } from './components/MetadataStrip';
import { SearchDocument, SearchExplorer } from './components/SearchExplorer';
import { loadCmsEntries, saveCmsEntries } from './lib/cms';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { EnterpriseRagCard } from './components/EnterpriseRagArticle';
import { TemperatureTutorialCard } from './components/TemperatureTutorialArticle';
import enterpriseRagArticle from './Engineering/data/enterprise-rag-technical-knowledge.json';

const AdminPanel = lazy(() => import('./components/AdminPanel').then((mod) => ({ default: mod.AdminPanel })));

const EmptyState = () => (
  <div className="glass rounded-3xl border border-white/10 p-8 text-center text-sm text-slate-600 dark:text-white/60">
    Data will be added soon.
  </div>
);

const tileStroke = { stroke: 'currentColor', strokeOpacity: 0.6, strokeWidth: 1.2, fill: 'none' } as const;

const HERO_TILES = [
  {
    href: '#research',
    index: '01',
    label: 'Research',
    color: '#e7dfcf',
    text: '#1f1e1c',
    art: (
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="62" cy="44" r="12" {...tileStroke} />
        <circle cx="62" cy="44" r="24" {...tileStroke} />
        <circle cx="62" cy="44" r="36" {...tileStroke} />
        <circle cx="62" cy="44" r="3" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: '#tutorial',
    index: '02',
    label: 'Tutorials',
    color: '#c9d4c3',
    text: '#1f1e1c',
    art: (
      <svg viewBox="0 0 100 100" aria-hidden="true">
        {[0, 1, 2, 3, 4].flatMap((row) =>
          [0, 1, 2, 3, 4].map((col) => (
            <circle key={`${row}-${col}`} cx={34 + col * 12} cy={18 + row * 12} r={row === col ? 3.2 : 1.6} fill="currentColor" fillOpacity={row === col ? 0.9 : 0.4} />
          ))
        )}
      </svg>
    ),
  },
  {
    href: '#engineering',
    index: '03',
    label: 'Engineering',
    color: '#e0b199',
    text: '#1f1e1c',
    art: (
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <rect x="44" y="14" width="34" height="34" {...tileStroke} />
        <polygon points="44,48 78,48 61,78" {...tileStroke} />
        <line x1="44" y1="14" x2="61" y2="78" {...tileStroke} />
        <line x1="78" y1="14" x2="61" y2="78" {...tileStroke} />
      </svg>
    ),
  },
  {
    href: '#case-studies',
    index: '04',
    label: 'Case studies',
    color: '#c3cfd8',
    text: '#1f1e1c',
    art: (
      <svg viewBox="0 0 100 100" aria-hidden="true">
        {[14, 26, 38, 22, 46].map((height, i) => (
          <rect key={i} x={30 + i * 11} y={62 - height} width="7" height={height} fill="currentColor" fillOpacity={0.3 + i * 0.14} />
        ))}
        <line x1="26" y1="62" x2="88" y2="62" {...tileStroke} />
      </svg>
    ),
  },
];

function sectionSchema() {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://inventyfie.com';

  return {
    '@context': 'https://schema.org',
    '@type': 'ResearchOrganization',
    name: 'Inventyfie',
    description: 'AI Engineering Research Lab publishing practical benchmarks, case studies, and architecture guides.',
    url: siteUrl,
    sameAs: ['https://github.com/inventyfie'],
    areaServed: 'Global',
    foundingDate: '2026',
    knowsAbout: [
      'AI Engineering',
      'Machine Learning',
      'RAG',
      'Decision Intelligence',
      'Benchmarking',
      'Architecture',
    ],
  };
}

const sectionTitleClass = 'theme-text-primary mb-4 font-display text-4xl font-bold md:text-6xl text-slate-900 dark:text-white';

type PageId = 'home' | 'research' | 'tutorial' | 'engineering' | 'case-studies';

const pageFromHash = (hash: string): PageId => {
  if (hash === '#home') return 'home';
  if (hash.startsWith('#tutorial')) return 'tutorial';
  if (hash === '#research') return 'research';
  if (hash.startsWith('#engineering')) return 'engineering';
  if (hash === '#case-studies') return 'case-studies';
  return 'home';
};

const engineeringTopicFromHash = (hash: string) => hash.startsWith('#engineering/') ? hash.slice('#engineering/'.length) : null;
const tutorialTopicFromHash = (hash: string) => hash.startsWith('#tutorial/') ? hash.slice('#tutorial/'.length) : null;

function TutorialDetail({ tutorial, onClose }: { tutorial: TutorialArticle; onClose?: () => void }) {
  return (
    <Section id="tutorial-detail" className="min-h-screen px-6 pb-24 pt-32">
      <div className="mx-auto max-w-5xl">
        {onClose ? (
          <button type="button" onClick={onClose} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-neon-cyan hover:underline">
            <ArrowRight size={16} className="rotate-180" /> Back to tutorials
          </button>
        ) : (
          <a href="#tutorial" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-neon-cyan hover:underline">
            <ArrowRight size={16} className="rotate-180" /> Back to tutorials
          </a>
        )}
        <div className="mb-10 max-w-3xl">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-neon-cyan">Tutorial / Sampling controls</p>
          <h1 className="theme-text-primary mb-3 font-display text-4xl font-bold md:text-6xl">{tutorial.title}</h1>
          <p className="mb-6 text-lg text-neon-cyan">{tutorial.subtitle}</p>
          <p className="theme-text-secondary text-lg leading-relaxed">{tutorial.summary}</p>
        </div>

        <figure className="mb-14 overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-2xl">
          <video className="aspect-video w-full" controls preload="metadata" poster={tutorial.thumbnail}>
            <source src={tutorial.video} type="video/mp4" />
            Your browser does not support the tutorial video.
          </video>
          <figcaption className="border-t border-white/10 px-5 py-3 text-xs text-slate-500 dark:text-white/45">Temperature changes the distribution; top-p changes the eligible set.</figcaption>
        </figure>

        <article className="glass readable-surface rounded-3xl border border-white/10 p-6 md:p-10">
          <div className="space-y-9">
            {tutorial.sections.map((section) => (
              <section key={section.title}>
                <h2 className="theme-text-primary mb-3 font-display text-2xl font-bold">{section.title}</h2>
                <div className="space-y-3">
                  {section.paragraphs.map((paragraph) => <p key={paragraph} className="theme-text-secondary leading-relaxed">{paragraph}</p>)}
                </div>
                {section.bullets ? <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-700 dark:text-white/70">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}
              </section>
            ))}
          </div>
        </article>
      </div>
    </Section>
  );
}

function TutorialShareButton({ tutorialId }: { tutorialId: string }) {
  const [copied, setCopied] = useState(false);

  const copyTutorialLink = async () => {
    const link = `${window.location.origin}${window.location.pathname}#tutorial/${tutorialId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy this tutorial link:', link);
    }
  };

  return (
    <button type="button" onClick={copyTutorialLink} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15" aria-label="Copy tutorial link" title="Copy tutorial link">
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? 'Link copied' : 'Share'}
    </button>
  );
}

function TutorialCard({ tutorial, isSelected = false }: { tutorial: TutorialArticle; isSelected?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  return (
    <>
      <article id={`tutorial-${tutorial.id}`} className={`theme-card-hover readable-surface overflow-hidden rounded-3xl border p-6 md:p-8 ${isSelected ? 'border-neon-cyan ring-2 ring-neon-cyan/50 shadow-[0_0_35px_rgba(0,242,255,0.3)]' : 'border-neon-cyan/25'}`}>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <img src={tutorial.thumbnail} alt={`${tutorial.title} thumbnail`} className="aspect-video w-full rounded-2xl border border-white/10 object-cover md:order-2 md:max-w-sm" />
          <div className="max-w-3xl">
            <p className="mb-2 text-xs uppercase tracking-[0.14em] text-neon-cyan">Featured tutorial · 10 sec</p>
            <h3 className="mb-3 font-display text-2xl font-bold text-white">{tutorial.title}</h3>
            <p className="mb-4 text-sm leading-relaxed text-white/70">{tutorial.subtitle}</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setIsOpen(true)} className="accent-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white">Read tutorial <ArrowRight size={16} /></button>
              <TutorialShareButton tutorialId={tutorial.id} />
            </div>
          </div>
        </div>
      </article>
      {isOpen ? createPortal(
        <div className="fixed inset-0 z-[100] bg-black/70 p-3 backdrop-blur-md md:p-8" role="dialog" aria-modal="true" aria-label="Tutorial reader" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
          <div className="relative h-full overflow-y-auto rounded-3xl border border-white/20 bg-slate-950/95 shadow-2xl">
            <button type="button" onClick={() => setIsOpen(false)} className="sticky right-5 top-5 z-20 ml-auto mr-5 mt-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white hover:bg-white/15" aria-label="Close tutorial reader"><X size={20} /></button>
            <TutorialDetail tutorial={tutorial} onClose={() => setIsOpen(false)} />
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}

export default function App() {
  const [cmsEntries, setCmsEntries] = useState<CmsEntry[]>(() => loadCmsEntries());
  const [isAdminRoute, setIsAdminRoute] = useState(() => window.location.hash === '#admin');
  const [activePage, setActivePage] = useState<PageId>(() => pageFromHash(window.location.hash));
  const [activeEngineeringTopic, setActiveEngineeringTopic] = useState(() => engineeringTopicFromHash(window.location.hash));
  const [activeTutorialTopic, setActiveTutorialTopic] = useState(() => tutorialTopicFromHash(window.location.hash));

  useEffect(() => {
    saveCmsEntries(cmsEntries);
  }, [cmsEntries]);

  useEffect(() => {
    const handleHashChange = () => {
      setIsAdminRoute(window.location.hash === '#admin');
      setActivePage(pageFromHash(window.location.hash));
      setActiveEngineeringTopic(engineeringTopicFromHash(window.location.hash));
      setActiveTutorialTopic(tutorialTopicFromHash(window.location.hash));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const isSharedTopic = (activePage === 'engineering' && activeEngineeringTopic) || (activePage === 'tutorial' && activeTutorialTopic);
    const targetId = activePage === 'engineering' && activeEngineeringTopic
      ? 'enterprise-rag-technical-knowledge-card'
      : activePage === 'tutorial' && activeTutorialTopic
      ? `tutorial-${activeTutorialTopic}`
      : hash === '#contact' || hash === '#about'
      ? hash.slice(1)
      : activePage;

    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'auto', block: isSharedTopic ? 'center' : 'start' });
    });
  }, [activePage, activeEngineeringTopic, activeTutorialTopic]);

  useEffect(() => {
    const siteUrl = import.meta.env.VITE_SITE_URL || 'https://inventyfie.com';

    document.title = 'Inventyfie | AI Engineering Research Lab';

    const setMeta = (name: string, content: string, property = false) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let node = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!node) {
        node = document.createElement('meta');
        if (property) {
          node.setAttribute('property', name);
        } else {
          node.setAttribute('name', name);
        }
        document.head.appendChild(node);
      }
      node.content = content;
    };

    const description = 'AI Engineering Research Platform for benchmarks, case studies, architecture guides, and decision frameworks.';
    setMeta('description', description);
    setMeta('keywords', 'AI engineering, benchmarks, case studies, RAG, LLMs, AI agents, architecture, decision frameworks');
    setMeta('robots', 'index, follow');
    setMeta('og:title', 'Inventyfie | AI Engineering Research Lab', true);
    setMeta('og:description', description, true);
    setMeta('og:type', 'website', true);
    setMeta('og:url', siteUrl, true);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', 'Inventyfie | AI Engineering Research Lab');
    setMeta('twitter:description', description);

    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = siteUrl;

    const schemaId = 'inventyfie-schema';
    let schemaNode = document.getElementById(schemaId) as HTMLScriptElement | null;
    if (!schemaNode) {
      schemaNode = document.createElement('script');
      schemaNode.type = 'application/ld+json';
      schemaNode.id = schemaId;
      document.head.appendChild(schemaNode);
    }
    schemaNode.textContent = JSON.stringify(sectionSchema());
  }, []);

  const heroInvestigation = RESEARCH_INVESTIGATIONS[0];

  const searchDocs = useMemo<SearchDocument[]>(() => {
    const docs: SearchDocument[] = [];

    RESEARCH_INVESTIGATIONS.forEach((item) => {
      docs.push({
        id: item.id,
        kind: 'Research',
        title: item.title,
        summary: item.researchQuestion,
        sectionHref: '#research',
        metadata: item.metadata,
        searchableContent: [item.background, item.businessProblem, item.methodology, item.results.join(' ')].join(' '),
      });
    });

    ENGINEERING_PROJECTS.forEach((item) => {
      docs.push({
        id: item.id,
        kind: 'Engineering',
        title: item.title,
        summary: item.problemStatement,
        sectionHref: '#engineering',
        metadata: item.metadata,
        searchableContent: [item.implementationDetails, item.businessValue, item.technologyStack.join(' ')].join(' '),
      });
    });

    CASE_STUDIES.forEach((item) => {
      docs.push({
        id: item.id,
        kind: 'Case Studies',
        title: item.title,
        summary: item.businessProblem,
        sectionHref: '#case-studies',
        metadata: item.metadata,
        searchableContent: [item.recommendedSolution, item.aiOpportunity, item.benefits.join(' ')].join(' '),
      });
    });

    TUTORIAL_ARTICLES.forEach((item) => {
      docs.push({
        id: item.id,
        kind: 'Tutorials',
        title: item.title,
        summary: item.summary,
        sectionHref: `#tutorial/${item.id}`,
        metadata: {
          difficulty: 'Beginner',
          industry: 'Cross-Industry',
          technology: ['Generative AI'],
          estimatedReadingTime: 5,
          businessDomain: 'AI Education',
          researchStatus: 'Published',
          updatedDate: '2026-09-14',
          author: 'Inventyfie Research Lab',
          version: '1.0.0',
          tags: ['Tutorial', 'LLMs'],
        },
        searchableContent: item.sections
          .flatMap((section) => [...section.paragraphs, ...(section.bullets ?? [])])
          .join(' '),
      });
    });

    docs.push({
      id: enterpriseRagArticle.slug,
      kind: 'Engineering',
      title: enterpriseRagArticle.title,
      summary: enterpriseRagArticle.subtitle,
      sectionHref: '#engineering',
      metadata: {
        difficulty: 'Advanced',
        industry: 'Cross-Industry',
        technology: enterpriseRagArticle.tags,
        estimatedReadingTime: 25,
        businessDomain: 'Knowledge Management',
        researchStatus: 'Published',
        updatedDate: '2026-09-14',
        author: 'Inventyfie Research Lab',
        version: '1.0.0',
        tags: enterpriseRagArticle.tags,
      },
      searchableContent: enterpriseRagArticle.sections.map((section) => `${section.title} ${section.content.join(' ')}`).join(' '),
    });

    cmsEntries.forEach((item) => {
      docs.push({
        id: item.id,
        kind: item.contentType,
        title: item.title,
        summary: item.summary,
        sectionHref: '#admin',
        metadata: item.metadata,
        searchableContent: item.markdown,
      });
    });

    return docs;
  }, [cmsEntries]);

  const iconByIndex = [Cpu, Brain, Zap];

  return (
    <ThemeProvider>
      <div className="relative min-h-screen overflow-x-hidden bg-paper">
        <Navbar
          navLinks={NAV_LINKS}
          activeHref={activePage === 'engineering' ? '#engineering' : activePage === 'tutorial' ? '#tutorial' : activePage === 'research' ? '#research' : activePage === 'case-studies' ? '#case-studies' : '#home'}
        />

        <main className="relative z-10">
          <>
          <section id="home" className={`${activePage === 'home' ? '' : 'hidden'} mx-auto flex min-h-[86vh] max-w-7xl flex-col justify-center px-6 pb-16 pt-36`}>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="mb-6 text-sm font-medium uppercase tracking-[0.18em] text-slate-500"
            >
              Inventyfie · AI Engineering Research Lab
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="hero-title max-w-5xl font-display text-4xl leading-[1.12] tracking-tight md:text-6xl"
            >
              <span className="font-semibold">Practical AI engineering, tested and explained.</span>{' '}
              <span className="font-light text-slate-500">
                We publish benchmarks, case studies and architecture guides for teams building AI that has to work in production.
              </span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="mt-10 flex flex-wrap gap-3"
            >
              <a href="#research" className="accent-button group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium">
                Explore research
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </a>
              <a className="secondary-button rounded-full border px-6 py-3 text-sm font-medium" href="#case-studies">
                Browse case studies
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.7 }}
              className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4"
            >
              {HERO_TILES.map((tile) => (
                <a key={tile.href} href={tile.href} className="hero-tile" style={{ backgroundColor: tile.color, color: tile.text }}>
                  {tile.art}
                  <span className="relative text-xs font-medium tracking-widest opacity-60">{tile.index}</span>
                  <span className="relative flex items-end justify-between font-display text-base font-medium sm:text-xl">
                    {tile.label}
                    <ArrowRight size={18} />
                  </span>
                </a>
              ))}
            </motion.div>
          </section>

          <Section id="search" className={`${activePage === 'home' ? '' : 'hidden'} px-4 sm:px-6 pb-12 pt-12 md:pt-16`}>
            <div className="mx-auto max-w-7xl">
              <SearchExplorer docs={searchDocs} cmsEntries={cmsEntries} />
            </div>
          </Section>

          <Section id="research" className={`${activePage === 'research' ? '' : 'hidden'} py-24 px-6`}>
            <div className="mx-auto max-w-7xl">
              <div className="mb-16 text-center md:text-left">
                <p className="mb-3 text-xs uppercase tracking-[0.2em] text-neon-cyan">Home / Research</p>
                <h2 className={sectionTitleClass}>Research <span className="text-neon-cyan">Investigations</span></h2>
                <p className="theme-text-secondary max-w-3xl text-slate-600 dark:text-white/50">
                  Latest Investigation: {heroInvestigation?.title}. Every publication follows a strict engineering research format covering research question, context, methodology, implementation, benchmark data, and future work.
                </p>
              </div>

              {RESEARCH_INVESTIGATIONS.length === 0 ? <EmptyState /> : null}
              <div className="grid gap-8 lg:grid-cols-2">
                {RESEARCH_INVESTIGATIONS.map((item) => (
                  <article key={item.id} className="theme-card-hover glass section-panel rounded-3xl border border-white/10 p-6">
                    <h3 className="theme-title-hover mb-3 font-display text-2xl font-bold text-slate-900 dark:text-white">{item.title}</h3>
                    <p className="mb-4 text-sm leading-relaxed text-slate-700 dark:text-white/70">{item.researchQuestion}</p>
                    <MetadataStrip metadata={item.metadata} />

                    <details className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.14em] text-neon-cyan">Open full research structure</summary>
                      <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-white/70">
                        <p><strong>Background:</strong> {item.background}</p>
                        <p><strong>Business Problem:</strong> {item.businessProblem}</p>
                        <p><strong>Industry Context:</strong> {item.industryContext}</p>
                        <p><strong>Research Objective:</strong> {item.researchObjective}</p>
                        <p><strong>Methodology:</strong> {item.methodology}</p>
                        <p><strong>Experiment Design:</strong> {item.experimentDesign}</p>
                        <p><strong>Implementation:</strong> {item.implementation}</p>
                        <p><strong>Dataset:</strong> {item.dataset}</p>
                        <p><strong>Benchmark:</strong> {item.benchmark}</p>
                        <p><strong>Conclusion:</strong> {item.conclusion}</p>
                        <p><strong>Existing Approaches:</strong> {item.existingApproaches.join(' · ')}</p>
                        <p><strong>Results:</strong> {item.results.join(' · ')}</p>
                        <p><strong>Limitations:</strong> {item.limitations.join(' · ')}</p>
                        <p><strong>Future Work:</strong> {item.futureWork.join(' · ')}</p>
                        <p><strong>References:</strong> {item.references.join(' · ')}</p>
                        <p><strong>Related Research:</strong> {item.relatedResearch.join(' · ')}</p>
                        <div className="flex flex-wrap gap-3 pt-2">
                          <a href={item.github} target="_blank" rel="noreferrer" className="text-neon-cyan hover:underline">GitHub</a>
                          <a href={item.downloads} target="_blank" rel="noopener noreferrer" className="text-neon-cyan hover:underline">Downloads</a>
                        </div>
                      </div>
                    </details>
                  </article>
                ))}
              </div>
            </div>
          </Section>

          <Section id="tutorial" className={`${activePage === 'tutorial' ? '' : 'hidden'} py-24 px-6`}>
            <div className="mx-auto max-w-7xl">
              <div className="mb-16 text-center md:text-left">
                <p className="mb-3 text-xs uppercase tracking-[0.2em] text-neon-cyan">Home / Tutorial</p>
                <h2 className={sectionTitleClass}>Learning <span className="text-neon-cyan">Tutorials</span></h2>
                <p className="theme-text-secondary max-w-3xl text-slate-600 dark:text-white/50">
                  Short guided walkthroughs to help you read research, compare architectures, and turn experiments into production-ready systems.
                </p>
              </div>

              <div className="grid gap-6">
                <TemperatureTutorialCard isSelected={activeTutorialTopic === 'llm-temperature'} />
              </div>
            </div>
          </Section>

          <Section id="engineering" className={`${activePage === 'engineering' ? '' : 'hidden'} section-panel py-24 px-6 bg-white/[0.02] dark:bg-white/[0.02]`}>
            <div className="mx-auto max-w-7xl">
              <div className="mb-16 text-center md:text-left">
                <p className="mb-3 text-xs uppercase tracking-[0.2em] text-neon-cyan">Home / Engineering</p>
                <h2 className={sectionTitleClass}>Engineering <span className="text-neon-purple">Showcases</span></h2>
                <p className="theme-text-secondary max-w-3xl text-slate-600 dark:text-white/50">
                  Production-grade implementations with architecture rationale, performance evidence, business ROI, security posture, and future roadmap.
                </p>
              </div>

              <EnterpriseRagCard isSelected={activeEngineeringTopic === 'enterprise-rag-technical-knowledge'} />
              <div className="grid gap-8 lg:grid-cols-2">
                {ENGINEERING_PROJECTS.map((project, index) => {
                  const Icon = iconByIndex[index % iconByIndex.length];
                  return (
                    <article key={project.id} className="theme-card-hover glass section-panel rounded-3xl border border-white/10 p-6">
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div className="icon-well rounded-lg bg-neon-cyan/10 p-2 text-neon-cyan">
                          <Icon size={22} />
                        </div>
                        <div className="flex gap-3 text-slate-600 dark:text-white/60">
                          <a href={project.github} target="_blank" rel="noreferrer" className="hover:text-neon-cyan"><Github size={18} /></a>
                          <a href={project.liveDemo} target="_blank" rel="noreferrer" className="hover:text-neon-cyan"><ArrowRight size={18} /></a>
                        </div>
                      </div>
                      <h3 className="mb-3 font-display text-2xl font-bold text-slate-900 dark:text-white">{project.title}</h3>
                      <p className="mb-3 text-sm text-slate-700 dark:text-white/70"><strong>Problem Statement:</strong> {project.problemStatement}</p>
                      <p className="mb-3 text-sm text-slate-700 dark:text-white/70"><strong>Architecture Diagram:</strong> {project.architectureDiagram}</p>
                      <p className="mb-3 text-sm text-slate-700 dark:text-white/70"><strong>Implementation Details:</strong> {project.implementationDetails}</p>
                      <p className="mb-3 text-sm text-slate-700 dark:text-white/70"><strong>Business Value:</strong> {project.businessValue}</p>
                      <p className="mb-3 text-sm text-slate-700 dark:text-white/70"><strong>Estimated ROI:</strong> {project.roi}</p>
                      <p className="mb-3 text-sm text-slate-700 dark:text-white/70"><strong>Challenges:</strong> {project.challenges.join(' · ')}</p>
                      <p className="mb-3 text-sm text-slate-700 dark:text-white/70"><strong>Lessons Learned:</strong> {project.lessonsLearned.join(' · ')}</p>
                      <p className="mb-3 text-sm text-slate-700 dark:text-white/70"><strong>Performance Metrics:</strong> {project.performanceMetrics.join(' · ')}</p>
                      <p className="mb-3 text-sm text-slate-700 dark:text-white/70"><strong>Cost Considerations:</strong> {project.costConsiderations.join(' · ')}</p>
                      <p className="mb-3 text-sm text-slate-700 dark:text-white/70"><strong>Security Considerations:</strong> {project.securityConsiderations.join(' · ')}</p>
                      <p className="mb-4 text-sm text-slate-700 dark:text-white/70"><strong>Future Improvements:</strong> {project.futureImprovements.join(' · ')}</p>
                      <MetadataStrip metadata={project.metadata} />
                    </article>
                  );
                })}
              </div>
            </div>
          </Section>

          <Section id="case-studies" className={`${activePage === 'case-studies' ? '' : 'hidden'} py-24 px-6`}>
            <div className="mx-auto max-w-7xl">
              <div className="mb-16 text-center md:text-left">
                <p className="mb-3 text-xs uppercase tracking-[0.2em] text-neon-cyan">Home / Case Studies</p>
                <h2 className={sectionTitleClass}>Case Study <span className="text-neon-cyan">Repository</span></h2>
                <p className="theme-text-secondary max-w-3xl text-slate-600 dark:text-white/50">
                  Business-first case studies spanning {CASE_STUDY_INDUSTRIES.join(', ')} with practical AI opportunity analysis and implementation guidance.
                </p>
              </div>

              {CASE_STUDIES.length === 0 ? <EmptyState /> : null}
              <div className="grid gap-8 lg:grid-cols-2">
                {CASE_STUDIES.map((study) => (
                  <article key={study.id} className="theme-card-hover glass rounded-3xl border border-white/10 p-6">
                    <h3 className="mb-2 font-display text-2xl font-bold text-slate-900 dark:text-white">{study.title}</h3>
                    <p className="mb-3 text-xs uppercase tracking-[0.14em] text-neon-cyan">{study.industry}</p>
                    <p className="mb-2 text-sm text-slate-700 dark:text-white/70"><strong>Business Problem:</strong> {study.businessProblem}</p>
                    <p className="mb-2 text-sm text-slate-700 dark:text-white/70"><strong>Current Industry Approach:</strong> {study.currentIndustryApproach}</p>
                    <p className="mb-2 text-sm text-slate-700 dark:text-white/70"><strong>Pain Points:</strong> {study.painPoints.join(' · ')}</p>
                    <p className="mb-2 text-sm text-slate-700 dark:text-white/70"><strong>AI Opportunity:</strong> {study.aiOpportunity}</p>
                    <p className="mb-2 text-sm text-slate-700 dark:text-white/70"><strong>Architecture:</strong> {study.architecture}</p>
                    <p className="mb-2 text-sm text-slate-700 dark:text-white/70"><strong>Implementation:</strong> {study.implementation}</p>
                    <p className="mb-2 text-sm text-slate-700 dark:text-white/70"><strong>Benefits:</strong> {study.benefits.join(' · ')}</p>
                    <p className="mb-2 text-sm text-slate-700 dark:text-white/70"><strong>Risks:</strong> {study.risks.join(' · ')}</p>
                    <p className="mb-4 text-sm text-slate-700 dark:text-white/70"><strong>Estimated ROI:</strong> {study.estimatedRoi}</p>
                    <p className="mb-4 text-sm text-slate-700 dark:text-white/70"><strong>Recommended Solution:</strong> {study.recommendedSolution}</p>
                    <MetadataStrip metadata={study.metadata} />
                  </article>
                ))}
              </div>
            </div>
          </Section>

          {isAdminRoute && (
          <Section id="admin" className="section-panel py-24 px-6 bg-white/[0.02] dark:bg-white/[0.02]">
            <div className="mx-auto max-w-7xl">
              <div className="mb-16 text-center md:text-left">
                <p className="mb-3 text-xs uppercase tracking-[0.2em] text-neon-cyan">Home / Admin</p>
                <h2 className={sectionTitleClass}>Admin <span className="text-neon-purple">Panel</span></h2>
                <p className="theme-text-secondary max-w-3xl text-slate-600 dark:text-white/50">
                  Lightweight CMS for creating Articles, Research, Case Studies, Projects, Resources, and Benchmarks in Markdown with image uploads, code snippets, and diagram blocks.
                </p>
              </div>

              <Suspense fallback={<div className="glass rounded-3xl border border-white/10 p-8 text-sm text-slate-700 dark:text-white/70">Loading content studio...</div>}>
                <AdminPanel
                  entries={cmsEntries}
                  onSave={(entry) => setCmsEntries((prev) => [entry, ...prev])}
                  onDelete={(id) => setCmsEntries((prev) => prev.filter((entry) => entry.id !== id))}
                />
              </Suspense>

              {cmsEntries.length > 0 ? (
                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  {cmsEntries.slice(0, 4).map((entry) => (
                    <article key={entry.id} className="glass rounded-3xl border border-white/10 p-6">
                      <p className="mb-2 text-xs uppercase tracking-[0.14em] text-neon-cyan">{entry.contentType}</p>
                      <h3 className="mb-3 font-display text-2xl font-semibold text-slate-900 dark:text-white">{entry.title}</h3>
                      <p className="mb-4 text-sm text-slate-700 dark:text-white/70">{entry.summary}</p>
                      <MarkdownRenderer content={entry.markdown.slice(0, 450)} />
                      <div className="mt-4">
                        <MetadataStrip metadata={entry.metadata} />
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          </Section>
          )}

          <Section id="about" className="py-24 px-6">
            <div className="mx-auto max-w-7xl">
              <div className="mb-14 max-w-4xl text-center md:text-left">
                <p className="mb-3 text-xs uppercase tracking-[0.2em] text-neon-cyan">Home / About</p>
                <h2 className="mb-5 font-display text-4xl font-bold text-white md:text-6xl">About <span className="text-neon-cyan">Inventyfie</span></h2>
                <h3 className="mb-5 font-display text-2xl font-semibold text-white md:text-3xl">Explore ideas. Build understanding. Create possibilities.</h3>
                <p className="max-w-3xl text-lg leading-relaxed text-white/85">{ABOUT_CONTENT.introduction}</p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a href="#tutorial" className="accent-button inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-bold text-white">Explore &amp; Learn <ArrowRight size={16} className="ml-2" /></a>
                  <a href="#contact" className="inline-flex items-center justify-center rounded-full border border-white/30 bg-slate-950/60 px-6 py-3 text-sm font-bold text-white transition-colors hover:border-neon-cyan hover:text-neon-cyan">Discuss Your AI Project</a>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <article className="glass rounded-3xl border border-white/20 bg-slate-950/70 p-6 shadow-xl backdrop-blur-md">
                  <h3 className="mb-3 font-display text-2xl font-semibold text-white">Knowledge Worth Sharing</h3>
                  <p className="mb-6 text-base leading-relaxed text-white/80">{ABOUT_CONTENT.mission}</p>
                  <h3 className="mb-3 font-display text-2xl font-semibold text-white">Understanding Through Exploration</h3>
                  <p className="text-base leading-relaxed text-white/80">{ABOUT_CONTENT.vision}</p>
                </article>

                <article className="glass rounded-3xl border border-white/20 bg-slate-950/70 p-6 shadow-xl backdrop-blur-md">
                  <h3 className="mb-3 font-display text-2xl font-semibold text-white">AI Consulting &amp; Development</h3>
                  <p className="text-base leading-relaxed text-white/80">{ABOUT_CONTENT.publicationPhilosophy}</p>
                </article>

                <article className="glass rounded-3xl border border-white/20 bg-slate-950/70 p-6 shadow-xl backdrop-blur-md">
                  <h3 className="mb-3 font-display text-2xl font-semibold text-white">What We Value</h3>
                  <p className="mb-6 text-base leading-relaxed text-white/80">{ABOUT_CONTENT.researchPrinciples[0]}</p>
                  <h3 className="mb-3 font-display text-2xl font-semibold text-white">Our Approach</h3>
                  <p className="text-base leading-relaxed text-white/80">{ABOUT_CONTENT.engineeringPrinciples[0]}</p>
                </article>
              </div>
            </div>
          </Section>

          <Section id="contact" className="py-24 px-6">
            <div className="mx-auto max-w-4xl glass section-panel rounded-3xl p-6 sm:p-12 md:p-20 text-center relative overflow-hidden">
              <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-neon-purple/20 blur-[100px]" />
              <h2 className="theme-text-primary mb-6 font-display text-4xl font-bold md:text-7xl text-slate-900 dark:text-white">
                Contact <br />
                <span className="text-neon-cyan">Research Team</span>
              </h2>
              <p className="theme-text-secondary mb-10 text-slate-600 dark:text-white/60 text-base md:text-lg">
                For collaboration, enterprise research programs, benchmark requests, publication partnerships, or technical inquiry.
              </p>

              <div className="flex flex-col items-center gap-8">
                <a
                  href="mailto:inventyfie@gmail.com?subject=Inventyfie%20Enquiry"
                  className="theme-text-primary group flex max-w-full items-center gap-3 break-all text-lg font-bold text-slate-900 dark:text-white hover:text-neon-cyan transition-colors sm:text-2xl md:text-4xl"
                >
                  <Mail className="h-6 w-6 shrink-0 md:h-8 md:w-8" />
                  inventyfie@gmail.com
                </a>

                <div className="flex gap-4 sm:gap-6">
                  {[
                    { icon: Linkedin, href: 'https://www.linkedin.com/company/inventyfie/?viewAsMember=true' },
                    { icon: Twitter, href: '#' },
                    { icon: Github, href: 'https://github.com/inventyfie' },
                  ].map((social, i) => (
                    <motion.a
                      key={i}
                      href={social.href}
                      target={social.href.startsWith('http') ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.2, rotate: 5 }}
                      className="flex h-12 w-12 items-center justify-center rounded-full border border-[#1f1e1c]/20 bg-[#1f1e1c]/5 text-[#1f1e1c] hover:border-neon-cyan hover:text-neon-cyan transition-colors"
                    >
                      <social.icon size={20} />
                    </motion.a>
                  ))}
                </div>
              </div>
            </div>
          </Section>
          </>
        </main>

        <footer className="theme-text-muted py-12 px-6 text-center text-slate-500 dark:text-white/30 border-t border-slate-300 dark:border-white/5">
          <p className="text-sm uppercase tracking-widest font-medium">
            © 2026 INVENTYFIE RESEARCH LAB · AI ENGINEERING RESEARCH PLATFORM
          </p>
        </footer>
      </div>
    </ThemeProvider>
  );
}
