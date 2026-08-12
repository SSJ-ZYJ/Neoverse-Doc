import { getMermaidSourceId } from './asset-id';
import { MERMAID_ASSET_PATHS } from './generated/assets';

export function getPreRenderedMermaidPath(source: string): string | null {
  const fileName = MERMAID_ASSET_PATHS[getMermaidSourceId(source)];
  return fileName ? `/mermaid/${fileName}` : null;
}
