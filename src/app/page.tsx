'use client';

import type React from 'react';
import { useState, useCallback, useRef } from 'react';
import { AppHeader } from '@/components/code-flow/app-header';
import { CodeEditor } from '@/components/code-flow/code-editor';
import { MermaidViewer } from '@/components/code-flow/mermaid-viewer';
import { generateMermaidDiagramAction } from './actions';
import { useToast } from '@/hooks/use-toast';
import type { GenerateMermaidDiagramOutput } from '@/ai/flows/generate-mermaid-diagram';

export default function CodeFlowPage() {
  const [code, setCode] = useState<string>('');
  const [mermaidSyntax, setMermaidSyntax] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedNodeText, setHighlightedNodeText] = useState<string | null>(null);
  
  // Ref to store the SVG element for export
  const mermaidSvgElementRef = useRef<SVGElement | null>(null);

  const getMermaidSvgElement = useCallback(() => mermaidSvgElementRef.current, []);
  const setMermaidSvgElement = useCallback((element: SVGElement | null) => {
    mermaidSvgElementRef.current = element;
  }, []);

  const { toast } = useToast();

  const handleGenerateDiagram = async () => {
    if (!code.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please enter some code to generate a diagram.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    setError(null);
    setHighlightedNodeText(null); // Reset highlight on new generation

    try {
      const result = await generateMermaidDiagramAction({ code }) as GenerateMermaidDiagramOutput & { error?: string };
      if (result.error) {
        throw new Error(result.error);
      }
      if (result.mermaidDiagram) {
        setMermaidSyntax(result.mermaidDiagram);
        toast({
          title: 'Diagram Generated',
          description: 'Mermaid diagram successfully created.',
        });
      } else {
        throw new Error('AI did not return a diagram. Try modifying your code or prompt.');
      }
    } catch (e: any) {
      console.error('Error generating diagram:', e);
      const errorMessage = e.message || 'Failed to generate diagram. Please try again.';
      setError(errorMessage);
      setMermaidSyntax(null);
      toast({
        title: 'Generation Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader 
        mermaidSyntax={mermaidSyntax}
        getMermaidSvgElement={getMermaidSvgElement}
      />
      <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="h-full min-h-[calc(100vh-200px)] md:min-h-0"> {/* Ensure editor takes available height */}
          <CodeEditor
            code={code}
            setCode={setCode}
            onGenerate={handleGenerateDiagram}
            isLoading={isLoading}
            highlightedTerm={highlightedNodeText}
          />
        </div>
        <div className="h-full min-h-[calc(100vh-200px)] md:min-h-0"> {/* Ensure viewer takes available height */}
           <MermaidViewer
            mermaidSyntax={mermaidSyntax}
            isLoading={isLoading}
            error={error}
            setHighlightedNodeText={setHighlightedNodeText}
            highlightedNodeText={highlightedNodeText}
            getMermaidSvgElement={getMermaidSvgElement}
            setMermaidSvgElement={setMermaidSvgElement}
          />
        </div>
      </main>
      <footer className="text-center p-4 text-muted-foreground text-sm border-t border-border">
        <p>&copy; {new Date().getFullYear()} CodeFlow. Powered by Genkit and Next.js.</p>
      </footer>
    </div>
  );
}
