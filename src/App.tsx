/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createPortal } from 'react-dom';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Brain,
  Check,
  ChevronDown,
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

type BackgroundTheme = {
  id: string;
  label: string;
  brandColor: string;
  buttonFrom: string;
  buttonTo: string;
  buttonGlow: string;
  highlightColor: string;
  backdrop: string;
  overlay: string;
  spark: string;
  orbA: string;
  orbB: string;
  gridOpacity: number;
};

const BACKGROUND_THEMES: BackgroundTheme[] = [
  {
    id: 'dynamic-orbit',
    label: 'Dynamic Orbit',
    brandColor: '#53eebe',
    buttonFrom: '#53eebe',
    buttonTo: '#ff7c6c',
    buttonGlow: 'rgba(83, 238, 190, 0.46)',
    highlightColor: '#53eebe',
    backdrop: 'radial-gradient(circle at 18% 14%, #071b2d 0%, #05070f 54%, #030409 100%)',
    overlay: 'radial-gradient(circle at 74% 26%, rgba(78, 255, 212, 0.2) 0%, rgba(78, 255, 212, 0) 55%), radial-gradient(circle at 24% 78%, rgba(255, 141, 112, 0.2) 0%, rgba(255, 141, 112, 0) 58%)',
    spark: 'radial-gradient(circle at 52% 48%, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0) 58%)',
    orbA: 'radial-gradient(circle, rgba(83, 238, 190, 0.48) 0%, rgba(83, 238, 190, 0.2) 40%, rgba(83, 238, 190, 0) 75%)',
    orbB: 'radial-gradient(circle, rgba(255, 124, 108, 0.45) 0%, rgba(255, 124, 108, 0.19) 40%, rgba(255, 124, 108, 0) 75%)',
    gridOpacity: 0.22,
  },
  {
    id: 'galaxy',
    label: 'Galaxy',
    brandColor: '#af78ff',
    buttonFrom: '#af78ff',
    buttonTo: '#57b2ff',
    buttonGlow: 'rgba(175, 120, 255, 0.44)',
    highlightColor: '#af78ff',
    backdrop: 'radial-gradient(circle at 20% 20%, #2c0f4f 0%, #0c1027 45%, #02030a 100%)',
    overlay: 'radial-gradient(circle at 72% 22%, rgba(161, 97, 255, 0.34) 0%, rgba(161, 97, 255, 0) 56%), radial-gradient(circle at 26% 76%, rgba(88, 166, 255, 0.24) 0%, rgba(88, 166, 255, 0) 56%)',
    spark: 'radial-gradient(circle at 65% 18%, rgba(255, 244, 220, 0.3) 0%, rgba(255, 244, 220, 0) 26%), radial-gradient(circle at 40% 66%, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 32%)',
    orbA: 'radial-gradient(circle, rgba(175, 120, 255, 0.54) 0%, rgba(175, 120, 255, 0.2) 38%, rgba(175, 120, 255, 0) 76%)',
    orbB: 'radial-gradient(circle, rgba(87, 178, 255, 0.48) 0%, rgba(87, 178, 255, 0.16) 38%, rgba(87, 178, 255, 0) 76%)',
    gridOpacity: 0.17,
  },
  {
    id: 'solar',
    label: 'Solar',
    brandColor: '#ffce5e',
    buttonFrom: '#ffce5e',
    buttonTo: '#ff624e',
    buttonGlow: 'rgba(255, 206, 94, 0.44)',
    highlightColor: '#ffce5e',
    backdrop: 'radial-gradient(circle at 28% 18%, #5d2600 0%, #2b1300 30%, #090909 78%, #030303 100%)',
    overlay: 'radial-gradient(circle at 74% 24%, rgba(255, 208, 106, 0.35) 0%, rgba(255, 208, 106, 0) 58%), radial-gradient(circle at 20% 78%, rgba(255, 98, 69, 0.25) 0%, rgba(255, 98, 69, 0) 58%)',
    spark: 'radial-gradient(circle at 36% 24%, rgba(255, 240, 181, 0.25) 0%, rgba(255, 240, 181, 0) 24%)',
    orbA: 'radial-gradient(circle, rgba(255, 206, 94, 0.58) 0%, rgba(255, 206, 94, 0.25) 40%, rgba(255, 206, 94, 0) 78%)',
    orbB: 'radial-gradient(circle, rgba(255, 98, 78, 0.5) 0%, rgba(255, 98, 78, 0.21) 40%, rgba(255, 98, 78, 0) 78%)',
    gridOpacity: 0.2,
  },
  {
    id: 'aurora',
    label: 'Aurora',
    brandColor: '#60fcd8',
    buttonFrom: '#60fcd8',
    buttonTo: '#6d81ff',
    buttonGlow: 'rgba(96, 252, 216, 0.42)',
    highlightColor: '#60fcd8',
    backdrop: 'radial-gradient(circle at 50% 10%, #07313a 0%, #061620 45%, #03060c 100%)',
    overlay: 'radial-gradient(circle at 76% 16%, rgba(64, 255, 207, 0.22) 0%, rgba(64, 255, 207, 0) 60%), radial-gradient(circle at 24% 78%, rgba(82, 122, 255, 0.18) 0%, rgba(82, 122, 255, 0) 60%)',
    spark: 'radial-gradient(circle at 52% 20%, rgba(216, 255, 252, 0.14) 0%, rgba(216, 255, 252, 0) 32%)',
    orbA: 'radial-gradient(circle, rgba(96, 252, 216, 0.54) 0%, rgba(96, 252, 216, 0.2) 38%, rgba(96, 252, 216, 0) 76%)',
    orbB: 'radial-gradient(circle, rgba(109, 129, 255, 0.46) 0%, rgba(109, 129, 255, 0.18) 38%, rgba(109, 129, 255, 0) 76%)',
    gridOpacity: 0.16,
  },
  {
    id: 'nebula',
    label: 'Nebula',
    brandColor: '#ff83d6',
    buttonFrom: '#ff83d6',
    buttonTo: '#857cff',
    buttonGlow: 'rgba(255, 131, 214, 0.42)',
    highlightColor: '#ff83d6',
    backdrop: 'radial-gradient(circle at 76% 18%, #31104a 0%, #170c2b 34%, #070712 78%, #020206 100%)',
    overlay: 'radial-gradient(circle at 22% 20%, rgba(255, 139, 207, 0.24) 0%, rgba(255, 139, 207, 0) 54%), radial-gradient(circle at 72% 78%, rgba(136, 126, 255, 0.24) 0%, rgba(136, 126, 255, 0) 56%)',
    spark: 'radial-gradient(circle at 58% 52%, rgba(255, 235, 255, 0.14) 0%, rgba(255, 235, 255, 0) 30%)',
    orbA: 'radial-gradient(circle, rgba(255, 131, 214, 0.52) 0%, rgba(255, 131, 214, 0.2) 40%, rgba(255, 131, 214, 0) 78%)',
    orbB: 'radial-gradient(circle, rgba(133, 124, 255, 0.5) 0%, rgba(133, 124, 255, 0.18) 40%, rgba(133, 124, 255, 0) 78%)',
    gridOpacity: 0.16,
  },
  {
    id: 'eclipse',
    label: 'Eclipse',
    brandColor: '#ffb05d',
    buttonFrom: '#588fff',
    buttonTo: '#ffb05d',
    buttonGlow: 'rgba(255, 176, 93, 0.4)',
    highlightColor: '#ffb05d',
    backdrop: 'radial-gradient(circle at 52% 26%, #111827 0%, #06070f 45%, #010102 100%)',
    overlay: 'radial-gradient(circle at 54% 28%, rgba(255, 184, 110, 0.16) 0%, rgba(255, 184, 110, 0) 42%), radial-gradient(circle at 24% 74%, rgba(73, 126, 255, 0.2) 0%, rgba(73, 126, 255, 0) 56%)',
    spark: 'radial-gradient(circle at 49% 24%, rgba(255, 233, 191, 0.17) 0%, rgba(255, 233, 191, 0) 24%)',
    orbA: 'radial-gradient(circle, rgba(88, 143, 255, 0.5) 0%, rgba(88, 143, 255, 0.2) 40%, rgba(88, 143, 255, 0) 78%)',
    orbB: 'radial-gradient(circle, rgba(255, 176, 93, 0.48) 0%, rgba(255, 176, 93, 0.19) 40%, rgba(255, 176, 93, 0) 78%)',
    gridOpacity: 0.14,
  },
  {
    id: 'lunar',
    label: 'Lunar',
    brandColor: '#9ec5ff',
    buttonFrom: '#9ec5ff',
    buttonTo: '#d8ddff',
    buttonGlow: 'rgba(158, 197, 255, 0.38)',
    highlightColor: '#9ec5ff',
    backdrop: 'radial-gradient(circle at 38% 12%, #1b2238 0%, #090b14 50%, #020306 100%)',
    overlay: 'radial-gradient(circle at 78% 24%, rgba(210, 220, 255, 0.22) 0%, rgba(210, 220, 255, 0) 54%), radial-gradient(circle at 18% 72%, rgba(126, 162, 255, 0.2) 0%, rgba(126, 162, 255, 0) 58%)',
    spark: 'radial-gradient(circle at 60% 28%, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 28%)',
    orbA: 'radial-gradient(circle, rgba(158, 197, 255, 0.48) 0%, rgba(158, 197, 255, 0.2) 40%, rgba(158, 197, 255, 0) 78%)',
    orbB: 'radial-gradient(circle, rgba(216, 221, 255, 0.44) 0%, rgba(216, 221, 255, 0.16) 40%, rgba(216, 221, 255, 0) 78%)',
    gridOpacity: 0.15,
  },
  {
    id: 'prism',
    label: 'Prism',
    brandColor: '#6fffd7',
    buttonFrom: '#6fffd7',
    buttonTo: '#ff7fd4',
    buttonGlow: 'rgba(111, 255, 215, 0.4)',
    highlightColor: '#6fffd7',
    backdrop: 'radial-gradient(circle at 14% 16%, #12304a 0%, #0a1025 45%, #04040a 100%)',
    overlay: 'radial-gradient(circle at 72% 20%, rgba(111, 255, 215, 0.2) 0%, rgba(111, 255, 215, 0) 58%), radial-gradient(circle at 26% 76%, rgba(255, 127, 212, 0.24) 0%, rgba(255, 127, 212, 0) 56%)',
    spark: 'radial-gradient(circle at 52% 38%, rgba(255, 241, 255, 0.14) 0%, rgba(255, 241, 255, 0) 30%)',
    orbA: 'radial-gradient(circle, rgba(111, 255, 215, 0.54) 0%, rgba(111, 255, 215, 0.2) 40%, rgba(111, 255, 215, 0) 78%)',
    orbB: 'radial-gradient(circle, rgba(255, 127, 212, 0.5) 0%, rgba(255, 127, 212, 0.18) 40%, rgba(255, 127, 212, 0) 78%)',
    gridOpacity: 0.18,
  },
  {
    id: 'abyss',
    label: 'Abyss',
    brandColor: '#36d4ff',
    buttonFrom: '#36d4ff',
    buttonTo: '#1f7dff',
    buttonGlow: 'rgba(54, 212, 255, 0.42)',
    highlightColor: '#36d4ff',
    backdrop: 'radial-gradient(circle at 50% 6%, #052437 0%, #04101a 42%, #010205 100%)',
    overlay: 'radial-gradient(circle at 80% 22%, rgba(54, 212, 255, 0.22) 0%, rgba(54, 212, 255, 0) 56%), radial-gradient(circle at 18% 82%, rgba(31, 125, 255, 0.22) 0%, rgba(31, 125, 255, 0) 58%)',
    spark: 'radial-gradient(circle at 46% 34%, rgba(185, 235, 255, 0.12) 0%, rgba(185, 235, 255, 0) 28%)',
    orbA: 'radial-gradient(circle, rgba(54, 212, 255, 0.52) 0%, rgba(54, 212, 255, 0.2) 40%, rgba(54, 212, 255, 0) 78%)',
    orbB: 'radial-gradient(circle, rgba(31, 125, 255, 0.48) 0%, rgba(31, 125, 255, 0.18) 40%, rgba(31, 125, 255, 0) 78%)',
    gridOpacity: 0.16,
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
  const [backgroundThemeIndex, setBackgroundThemeIndex] = useState(0);
  const [cmsEntries, setCmsEntries] = useState<CmsEntry[]>(() => loadCmsEntries());
  const [isAdminRoute, setIsAdminRoute] = useState(() => window.location.hash === '#admin');
  const [activePage, setActivePage] = useState<PageId>(() => pageFromHash(window.location.hash));
  const [activeEngineeringTopic, setActiveEngineeringTopic] = useState(() => engineeringTopicFromHash(window.location.hash));
  const [activeTutorialTopic, setActiveTutorialTopic] = useState(() => tutorialTopicFromHash(window.location.hash));

  const chooseRandomThemeIndex = useCallback((current: number) => {
    if (BACKGROUND_THEMES.length < 2) {
      return current;
    }

    let next = current;
    while (next === current) {
      next = Math.floor(Math.random() * BACKGROUND_THEMES.length);
    }
    return next;
  }, []);

  const randomizeTheme = useCallback(() => {
    setBackgroundThemeIndex((prev) => chooseRandomThemeIndex(prev));
  }, [chooseRandomThemeIndex]);

  useEffect(() => {
    let cycleTimer = 0;

    const scheduleNextTheme = () => {
      const nextInMs = 10000 + Math.random() * 9000;
      cycleTimer = window.setTimeout(() => {
        setBackgroundThemeIndex((prev) => chooseRandomThemeIndex(prev));
        scheduleNextTheme();
      }, nextInMs);
    };

    scheduleNextTheme();
    return () => window.clearTimeout(cycleTimer);
  }, [chooseRandomThemeIndex]);

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

  const activeBackgroundTheme = BACKGROUND_THEMES[backgroundThemeIndex] ?? BACKGROUND_THEMES[0];
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
      <motion.div
        className="relative min-h-screen overflow-x-hidden"
        animate={
          {
            '--theme-brand-color': activeBackgroundTheme.brandColor,
            '--theme-button-from': activeBackgroundTheme.buttonFrom,
            '--theme-button-to': activeBackgroundTheme.buttonTo,
            '--theme-button-glow': activeBackgroundTheme.buttonGlow,
            '--theme-highlight-color': activeBackgroundTheme.highlightColor,
          } as any
        }
        transition={{ duration: 3.2, ease: 'easeInOut' }}
      >
        <div className="fixed inset-0 z-0 overflow-hidden">
          <AnimatePresence mode="sync">
            <motion.div
              key={`theme-backdrop-${activeBackgroundTheme.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.8, ease: 'easeInOut' }}
              className="absolute inset-0"
              style={{ background: activeBackgroundTheme.backdrop }}
            />
          </AnimatePresence>

          <AnimatePresence mode="sync">
            <motion.div
              key={`theme-overlay-${activeBackgroundTheme.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 3.2, ease: 'easeInOut' }}
              className="absolute inset-0"
              style={{ background: activeBackgroundTheme.overlay, mixBlendMode: 'screen' }}
            />
          </AnimatePresence>

          <motion.div
            className="neural-grid absolute inset-0"
            animate={{ opacity: activeBackgroundTheme.gridOpacity }}
            transition={{ duration: 2.6, ease: 'easeInOut' }}
          />

          <AnimatePresence mode="sync">
            <motion.div
              key={`theme-orbits-${activeBackgroundTheme.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.8, ease: 'easeInOut' }}
              className="absolute inset-0 pointer-events-none"
            >
              <div className="orb-orbit absolute inset-[-18%]">
                <div
                  className="orb-theme-blob absolute left-1/2 top-[3%] h-[72%] w-[72%] -translate-x-1/2 rounded-full blur-[112px]"
                  style={{ background: activeBackgroundTheme.orbA }}
                />
              </div>
              <div className="orb-orbit orb-orbit-opposite absolute inset-[-18%]">
                <div
                  className="orb-theme-blob absolute left-1/2 top-[3%] h-[72%] w-[72%] -translate-x-1/2 rounded-full blur-[112px]"
                  style={{ background: activeBackgroundTheme.orbB }}
                />
              </div>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="sync">
            <motion.div
              key={`theme-spark-${activeBackgroundTheme.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 3.4, ease: 'easeInOut' }}
              className="absolute inset-0 pointer-events-none"
              style={{ background: activeBackgroundTheme.spark }}
            />
          </AnimatePresence>
        </div>

        <Navbar
          theme={{
            id: activeBackgroundTheme.id,
            label: activeBackgroundTheme.label,
          }}
          onThemeChipClick={randomizeTheme}
          navLinks={NAV_LINKS}
          activeHref={activePage === 'engineering' ? '#engineering' : activePage === 'tutorial' ? '#tutorial' : activePage === 'research' ? '#research' : activePage === 'case-studies' ? '#case-studies' : '#home'}
        />

        <main className="relative z-10">
          <>
          <section id="home" className={`${activePage === 'home' ? '' : 'hidden'} flex min-h-screen flex-col items-center justify-center px-6 pt-20 text-center`}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="eyebrow-badge mb-6 inline-flex items-center gap-2 rounded-full border border-neon-cyan/30 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-neon-cyan"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-cyan opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-cyan"></span>
              </span>
            AI Engineering Research Lab
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="hero-title theme-text-primary mb-6 font-display text-5xl font-bold leading-[1.1] tracking-tight text-slate-900 dark:text-white md:text-8xl"
            >
              Inventyfie <br />
              <span className="text-gradient">Research. Engineering. Practical AI.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="hero-copy theme-text-secondary mx-auto mb-10 max-w-3xl text-lg text-slate-600 dark:text-white/60 md:text-xl"
            >
               AI Engineering Research Platform for practical investigations, decision intelligence frameworks, production architecture guides, and implementation-grade case studies.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="flex flex-col gap-4 sm:flex-row sm:gap-6"
            >
              <a
                href="#research"
                className="accent-button group flex items-center gap-2 rounded-full px-8 py-4 font-bold text-white transition-all hover:shadow-[0_0_30px_rgba(0,242,255,0.5)]"
                style={{ backgroundImage: 'linear-gradient(120deg, var(--theme-button-from), var(--theme-button-to))' }}
              >
                Explore Research
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </a>
              <a className="secondary-button rounded-full border px-8 py-4 font-bold backdrop-blur-sm transition-all" href="#case-studies">
                Browse Case Studies
              </a>
              <a className="secondary-button rounded-full border px-8 py-4 font-bold backdrop-blur-sm transition-all" href="#engineering">
                Engineering Projects
              </a>
            </motion.div>

            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 text-slate-400 dark:text-white/30"
            >
              <ChevronDown size={32} />
            </motion.div>
          </section>

          <Section id="search" className={`${activePage === 'home' ? '' : 'hidden'} px-6 pb-12 pt-12 md:pt-16`}>
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
                          <a href={item.downloads} className="text-neon-cyan hover:underline">Downloads</a>
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
            <div className="mx-auto max-w-4xl glass section-panel rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
              <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-neon-purple/20 blur-[100px]" />
              <h2 className="theme-text-primary mb-6 font-display text-4xl font-bold md:text-7xl text-slate-900 dark:text-white">
                Contact <br />
                <span className="text-neon-cyan">Research Team</span>
              </h2>
              <p className="theme-text-secondary mb-12 text-slate-600 dark:text-white/60 text-lg">
                For collaboration, enterprise research programs, benchmark requests, publication partnerships, or technical inquiry.
              </p>

              <div className="flex flex-col items-center gap-8">
                <a
                  href="mailto:inventyfie@gmail.com?subject=Inventyfie%20Enquiry"
                  className="theme-text-primary group flex items-center gap-4 text-2xl font-bold text-slate-900 dark:text-white hover:text-neon-cyan transition-colors md:text-4xl"
                >
                  <Mail size={32} />
                  inventyfie@gmail.com
                </a>

                <div className="flex gap-6">
                  {[
                    { icon: Linkedin, href: '#' },
                    { icon: Twitter, href: '#' },
                    { icon: Github, href: 'https://github.com/inventyfie' },
                  ].map((social, i) => (
                    <motion.a
                      key={i}
                      href={social.href}
                      whileHover={{ scale: 1.2, rotate: 5 }}
                      className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:border-neon-cyan hover:text-neon-cyan transition-colors"
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
      </motion.div>
    </ThemeProvider>
  );
}
