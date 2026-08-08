import { MERMAID_ASSET_PATHS } from '@/generated/mermaid-assets';
import { getMermaidSourceId } from '@/lib/mermaid-asset-id';

export function getPreRenderedMermaidPath(source: string): string | null {
  const fileName = MERMAID_ASSET_PATHS[getMermaidSourceId(source)];
  return fileName ? `/mermaid/${fileName}` : null;
}
