import { CmsEntry } from '../data/platformContent';

const CMS_STORAGE_KEY = 'inventyfie.cms.entries.v1';

const isCmsEntry = (value: unknown): value is CmsEntry => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const entry = value as Partial<CmsEntry>;
  const metadata = entry.metadata;
  return Boolean(
    typeof entry.id === 'string' &&
      typeof entry.contentType === 'string' &&
      typeof entry.title === 'string' &&
      typeof entry.slug === 'string' &&
      typeof entry.summary === 'string' &&
      typeof entry.markdown === 'string' &&
      typeof entry.createdAt === 'string' &&
      metadata &&
      typeof metadata === 'object' &&
      Array.isArray(metadata.technology) &&
      Array.isArray(metadata.tags),
  );
};

export const loadCmsEntries = (): CmsEntry[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CMS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isCmsEntry);
  } catch {
    return [];
  }
};

export const saveCmsEntries = (entries: CmsEntry[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(CMS_STORAGE_KEY, JSON.stringify(entries));
  } catch {
  }
};
