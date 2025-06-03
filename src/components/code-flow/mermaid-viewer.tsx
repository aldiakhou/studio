
'use client';

import mermaid from 'mermaid';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface MermaidViewerProps {
  mermaidSyntax: string | null;
  isLoading: boolean;
  error: string | null;
  setHighlightedNodeText: (text: string | null) => void;
  highlightedNodeText: string | null;
  getMermaidSvgElement: () => SVGElement | null;
  setMermaidSvgElement: (element: SVGElement | null) => void;
}

export function MermaidViewer({
  mermaidSyntax,
  isLoading,
  error,
  setHighlightedNodeText,
  highlightedNodeText,
  getMermaidSvgElement,
  setMermaidSvgElement,
}: MermaidViewerProps) {
  const diagramContainerRef = useRef<HTMLDivElement>(null);
  const [isDiagramLoaded, setIsDiagramLoaded] = useState(false);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'loose',
      dompurifyConfig: {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_TAGS: ['foreignobject'],
        ADD_ATTR: ['style', 'id', 'class'],
      },
      flowchart: {
        nodeSpacing: 60,
        rankSpacing: 60,
        htmlLabels: true,
      },
      themeVariables: {
        primaryColor: '#F5F5F5',
        primaryTextColor: '#0A0A0A',
        primaryBorderColor: '#4B0082',
        lineColor: '#4B0082',
        secondaryColor: '#EE82EE',
        tertiaryColor: '#FFFFFF',
        fontSize: '14px',
      }
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const renderFn = async () => {
      if (!diagramContainerRef.current && mermaidSyntax) {
        // Ref might not be available immediately if div is conditionally rendered.
        // Wait for next render cycle if necessary, or ensure div exists when syntax is present.
        // For now, if ref is null, we can't proceed.
        return;
      }
      
      if (!mermaidSyntax) {
        if (diagramContainerRef.current) {
            diagramContainerRef.current.innerHTML = ''; // Clear if syntax becomes null
        }
        if (isMounted) {
            setMermaidSvgElement(null);
            setIsDiagramLoaded(false);
        }
        return;
      }

      // At this point, mermaidSyntax is present. We expect diagramContainerRef.current to be valid.
      if (!diagramContainerRef.current) return; // Guard if somehow still null

      if (isMounted) {
        setIsDiagramLoaded(false);
        setMermaidSvgElement(null);
      }

      try {
        diagramContainerRef.current.innerHTML = ''; // Clear before new render
        const { svg, bindFunctions } = await mermaid.render('mermaid-diagram-svg', mermaidSyntax);

        if (!isMounted || !diagramContainerRef.current) return;

        diagramContainerRef.current.innerHTML = svg;
        if (bindFunctions) {
          bindFunctions(diagramContainerRef.current);
        }
        
        const svgElement = diagramContainerRef.current.querySelector('svg');
        if (isMounted) {
          setMermaidSvgElement(svgElement as SVGElement | null);
        }

        const nodes = diagramContainerRef.current.querySelectorAll('g.node');
        nodes.forEach(nodeEl => {
          const rectOrMainShape = nodeEl.querySelector('rect, circle, polygon, ellipse, path.node-shape');
          const textEl = nodeEl.querySelector('.nodeLabel, text, tspan');
          
          if (rectOrMainShape && textEl) {
            const nodeTextContent = textEl.textContent?.trim() || null;
            if (nodeTextContent) {
              (rectOrMainShape as HTMLElement).style.cursor = 'pointer';
              
              const clickHandler = () => {
                if (isMounted) setHighlightedNodeText(nodeTextContent);
              };
              
              const oldListener = (rectOrMainShape as any)._clickHandler;
              if (oldListener) rectOrMainShape.removeEventListener('click', oldListener);
              
              rectOrMainShape.addEventListener('click', clickHandler);
              (rectOrMainShape as any)._clickHandler = clickHandler;
            }
          }
        });
        if (isMounted) {
          setIsDiagramLoaded(true);
        }
      } catch (e: any) {
        console.error('Mermaid rendering error:', e);
        if (isMounted && diagramContainerRef.current) {
          diagramContainerRef.current.innerHTML = `<p class="text-destructive">Error rendering diagram: ${e.message || 'Unknown error'}</p>`;
        }
        if (isMounted) {
          setMermaidSvgElement(null);
          setIsDiagramLoaded(false);
        }
      }
    };

    renderFn();

    return () => {
      isMounted = false;
    };
  }, [mermaidSyntax, setMermaidSvgElement, setHighlightedNodeText]);


  useEffect(() => {
    const svgToUpdate = getMermaidSvgElement();
    if (svgToUpdate) {
      const allNodes = svgToUpdate.querySelectorAll('g.node');
      allNodes.forEach(nodeEl => {
        const rectOrMainShape = nodeEl.querySelector('rect, circle, polygon, ellipse, path.node-shape');
        const textEl = nodeEl.querySelector('.nodeLabel, text, tspan');
        
        if (rectOrMainShape && textEl) {
          const nodeTextContent = textEl.textContent?.trim();
          const isHighlighted = nodeTextContent && nodeTextContent === highlightedNodeText;
          
          (rectOrMainShape as SVGElement).style.fill = '';
          (rectOrMainShape as SVGElement).style.stroke = '';
          (rectOrMainShape as SVGElement).style.strokeWidth = '';

          if (isHighlighted) {
            (rectOrMainShape as SVGElement).style.fill = 'hsl(var(--accent))';
            (rectOrMainShape as SVGElement).style.stroke = 'hsl(var(--primary))';
            (rectOrMainShape as SVGElement).style.strokeWidth = '3px';
          }
        }
      });
    }
  }, [highlightedNodeText, getMermaidSvgElement]);


  return (
    <Card className="h-full flex flex-col shadow-lg rounded-lg overflow-hidden">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Diagram View</CardTitle>
        <CardDescription>Visual representation of your code.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center bg-card relative p-2 sm:p-4">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-semibold text-foreground">Generating diagram...</p>
          </div>
        )}
        
        {!isLoading && error && (
           <Alert variant="destructive" className="w-full max-w-md">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>Error</AlertTitle>
             <AlertDescription>{error}</AlertDescription>
           </Alert>
        )}

        {!isLoading && !error && !mermaidSyntax && (
          <div className="text-center text-muted-foreground">
            <p className="text-lg">Generate a diagram to see it here.</p>
            <p className="text-sm">Input your code and click "Generate Diagram".</p>
          </div>
        )}

        {/* Container for Skeleton (if shown) and Mermaid diagram div */}
        {!isLoading && !error && mermaidSyntax && (
          <>
            {/* Skeleton shown while mermaid.js is actually processing the syntax */}
            {!isDiagramLoaded && (
              <div className="w-full h-full flex items-center justify-center">
                  <Skeleton className="w-full h-[calc(100%-2rem)] rounded-md" />
              </div>
            )}
            {/* Actual Mermaid container div.
                It's present in the DOM if syntax is available, and visibility is toggled by opacity.
                Crucially, it has NO React-rendered children. */}
            <div
              ref={diagramContainerRef}
              id="mermaid-diagram-container"
              className={`w-full h-full min-h-[300px] transition-opacity duration-500 ${isDiagramLoaded ? 'opacity-100' : 'opacity-0'}`}
              aria-live="polite"
              style={{ display: (!isLoading && !error && mermaidSyntax) ? 'block' : 'none' }} // Ensures div exists for ref if syntax is present
            >
              {/* Mermaid diagram will be rendered here by direct DOM manipulation */}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Loader component
function Loader2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
