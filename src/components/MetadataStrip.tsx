import { ContentMetadata } from '../data/platformContent';

interface MetadataStripProps {
  metadata: ContentMetadata;
}

export const MetadataStrip = ({ metadata }: MetadataStripProps) => {
  const pills = [
    `Difficulty: ${metadata.difficulty}`,
    `Industry: ${metadata.industry}`,
    `Read: ${metadata.estimatedReadingTime} min`,
    `Domain: ${metadata.businessDomain}`,
    `Status: ${metadata.researchStatus}`,
    `Updated: ${metadata.updatedDate}`,
    `Author: ${metadata.author}`,
    `Version: ${metadata.version}`,
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {pills.map((pill, index) => (
        <span
          key={pill}
          className={`tag-chip rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-white/45 ${index % 2 === 0 ? '' : 'hidden sm:inline-block'}`}
        >
          {pill}
        </span>
      ))}
      {metadata.technology.map((tech) => (
        <span
          key={tech}
          className="tag-chip rounded-full border border-neon-cyan/25 bg-neon-cyan/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-neon-cyan"
        >
          {tech}
        </span>
      ))}
      {metadata.tags.map((tag) => (
        <span
          key={tag}
          className="tag-chip rounded-full border border-neon-purple/20 bg-neon-purple/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-neon-purple"
        >
          {tag}
        </span>
      ))}
    </div>
  );
};
