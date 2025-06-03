
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
  const [internalError, setInternalError] = useState<string | null>(null);


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
        htmlLabels: false, // Changed from true to false
      },
      themeVariables: {
        primaryColor: 'hsl(var(--background))', // Using background for shapes
        primaryTextColor: 'hsl(var(--foreground))',
        primaryBorderColor: 'hsl(var(--primary))', // Primary for borders
        lineColor: 'hsl(var(--primary))',
        secondaryColor: 'hsl(var(--accent))', // Accent for highlights or secondary elements
        tertiaryColor: 'hsl(var(--card))', // Card for e.g. cluster backgrounds
        fontSize: '14px',
        // Ensure colors match the theme in globals.css
        background: 'hsl(var(--background))', 
        mainBkg: 'hsl(var(--accent))', // Example: map an accent color
        textColor: 'hsl(var(--foreground))',
        // You might need to map more variables depending on the diagram types and theme used
      }
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    setInternalError(null); // Clear previous internal errors on new syntax

    const renderFn = async () => {
      if (!diagramContainerRef.current && mermaidSyntax) {
        return;
      }
      
      if (!mermaidSyntax) {
        if (diagramContainerRef.current) {
            diagramContainerRef.current.innerHTML = ''; 
        }
        if (isMounted) {
            setMermaidSvgElement(null);
            setIsDiagramLoaded(false);
        }
        return;
      }

      if (!diagramContainerRef.current) return; 

      if (isMounted) {
        setIsDiagramLoaded(false);
        setMermaidSvgElement(null);
      }

      try {
        // Clear previous content specifically
        const container = diagramContainerRef.current;
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        
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
          const rectOrMainShape = nodeEl.querySelector('rect, circle, polygon, ellipse, path.node-shape, .label-container'); // Include .label-container for some diagram types
          const textEl = nodeEl.querySelector('.nodeLabel, text, tspan, .edgeLabel, foreignObject div'); // Broader selection for text
          
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
        if (isMounted) {
          setInternalError(`MermaidLib Error: ${e.message || 'Unknown Mermaid rendering error'}`);
          setMermaidSvgElement(null);
          setIsDiagramLoaded(false);
           if (diagramContainerRef.current) { // Clear container on error too
             diagramContainerRef.current.innerHTML = '';
           }
        }
      }
    };

    if (mermaidSyntax) { // Only attempt render if there's syntax
      renderFn();
    }
    

    return () => {
      isMounted = false;
      // Cleanup: remove click handlers if any were attached outside of React's lifecycle
      if (diagramContainerRef.current) {
        const nodes = diagramContainerRef.current.querySelectorAll('g.node');
        nodes.forEach(nodeEl => {
          const rectOrMainShape = nodeEl.querySelector('rect, circle, polygon, ellipse, path.node-shape, .label-container');
          if (rectOrMainShape && (rectOrMainShape as any)._clickHandler) {
            rectOrMainShape.removeEventListener('click', (rectOrMainShape as any)._clickHandler);
            delete (rectOrMainShape as any)._clickHandler;
          }
        });
      }
    };
  }, [mermaidSyntax, setMermaidSvgElement, setHighlightedNodeText]);


  useEffect(() => {
    const svgToUpdate = getMermaidSvgElement();
    if (svgToUpdate) {
      const allNodes = svgToUpdate.querySelectorAll('g.node');
      allNodes.forEach(nodeEl => {
        const rectOrMainShape = nodeEl.querySelector('rect, circle, polygon, ellipse, path.node-shape, .label-container');
        const textEl = nodeEl.querySelector('.nodeLabel, text, tspan, .edgeLabel, foreignObject div');
        
        if (rectOrMainShape && textEl) {
          const nodeTextContent = textEl.textContent?.trim();
          const isHighlighted = nodeTextContent && nodeTextContent === highlightedNodeText;
          
          // Reset styles first
          (rectOrMainShape as SVGElement).style.fill = ''; 
          (rectOrMainShape as SVGElement).style.stroke = '';
          (rectOrMainShape as SVGElement).style.strokeWidth = '';

          // Attempt to reset text fill as well, though it might be complex if specific classes override
          const textElements = nodeEl.querySelectorAll('.nodeLabel, text, tspan');
          textElements.forEach(txt => {
            (txt as SVGElement).style.fill = '';
          });

          if (isHighlighted) {
            (rectOrMainShape as SVGElement).style.fill = 'hsl(var(--accent))';
            (rectOrMainShape as SVGElement).style.stroke = 'hsl(var(--primary))';
            (rectOrMainShape as SVGElement).style.strokeWidth = '3px';
            textElements.forEach(txt => { // Ensure text is readable on highlight
                (txt as SVGElement).style.fill = 'hsl(var(--accent-foreground))';
            });
          }
        }
      });
    }
  }, [highlightedNodeText, getMermaidSvgElement]);

  const displayError = error || internalError;

  return (
    <Card className="h-full flex flex-col shadow-lg rounded-lg overflow-hidden">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Diagram View</CardTitle>
        <CardDescription>Visual representation of your code. Click nodes to highlight.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center bg-card relative p-2 sm:p-4">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-semibold text-foreground">Generating diagram...</p>
          </div>
        )}
        
        {!isLoading && displayError && (
           <Alert variant="destructive" className="w-full max-w-md">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>Error Rendering Diagram</AlertTitle>
             <AlertDescription>{displayError}</AlertDescription>
           </Alert>
        )}

        {!isLoading && !displayError && !mermaidSyntax && (
          <div className="text-center text-muted-foreground">
            <p className="text-lg">Generate a diagram to see it here.</p>
            <p className="text-sm">Input your code or upload a folder and click "Generate Diagram".</p>
          </div>
        )}
        
        {!isLoading && !displayError && mermaidSyntax && (
          <>
            {!isDiagramLoaded && (
              <div className="w-full h-full flex items-center justify-center">
                  <Skeleton className="w-full h-[calc(100%-2rem)] rounded-md" />
              </div>
            )}
            <div
              ref={diagramContainerRef}
              id="mermaid-diagram-container"
              className={`w-full h-full min-h-[300px] transition-opacity duration-300 ${isDiagramLoaded ? 'opacity-100' : 'opacity-0'}`}
              aria-live="polite"
              style={{ visibility: isDiagramLoaded ? 'visible' : 'hidden' }} 
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

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

