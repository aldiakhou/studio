import type React from 'react';
import { ExportControls, type ExportControlsProps } from './export-controls';
import { CodeXml } from 'lucide-react';

interface AppHeaderProps extends ExportControlsProps {
  // any other props needed for AppHeader
}

export function AppHeader({ mermaidSyntax, getMermaidSvgElement }: AppHeaderProps) {
  return (
    <header className="bg-primary text-primary-foreground p-4 shadow-md flex justify-between items-center">
      <div className="flex items-center gap-2">
        <CodeXml size={32} />
        <h1 className="text-2xl font-headline font-semibold">CodeFlow</h1>
      </div>
      <ExportControls mermaidSyntax={mermaidSyntax} getMermaidSvgElement={getMermaidSvgElement} />
    </header>
  );
}
