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
      theme: 'neutral', // Base theme, can be customized further with CSS if needed
      securityLevel: 'loose', // Required for click interactions if embedded in mermaid syntax
      dompurifyConfig: {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_TAGS: ['foreignobject'], // Sometimes needed for complex labels
        ADD_ATTR: ['style', 'id', 'class'],
      },
      // Consistent styling for nodes
      flowchart: {
        nodeSpacing: 60,
        rankSpacing: 60,
        htmlLabels: true, // Allow HTML in labels for more complex styling if needed
      },
      // Apply some base styling to match the app's theme
      themeVariables: {
        primaryColor: '#F5F5F5', // Background of nodes (app background)
        primaryTextColor: '#0A0A0A', // Text on nodes (app foreground)
        primaryBorderColor: '#4B0082', // Border of nodes (app primary)
        lineColor: '#4B0082', // Edge lines (app primary)
        secondaryColor: '#EE82EE', // Accent for specific elements if used by mermaid
        tertiaryColor: '#FFFFFF', // Default for some elements
        fontSize: '14px', // Consistent font size
      }
    });
  }, []);

  useEffect(() => {
    const renderDiagram = async () => {
      if (mermaidSyntax && diagramContainerRef.current) {
        setIsDiagramLoaded(false);
        setMermaidSvgElement(null);
        try {
          // Ensure the container is empty before rendering
          diagramContainerRef.current.innerHTML = '';
          const { svg, bindFunctions } = await mermaid.render('mermaid-diagram-svg', mermaidSyntax);
          diagramContainerRef.current.innerHTML = svg;
          if (bindFunctions) {
            bindFunctions(diagramContainerRef.current);
          }
          
          const svgElement = diagramContainerRef.current.querySelector('svg');
          setMermaidSvgElement(svgElement as SVGElement | null);

          // Attach click listeners after rendering
          const nodes = diagramContainerRef.current.querySelectorAll('g.node'); // Common selector for nodes
          nodes.forEach(nodeEl => {
            const rectOrMainShape = nodeEl.querySelector('rect, circle, polygon, ellipse, path.node-shape');
            const textEl = nodeEl.querySelector('.nodeLabel, text, tspan'); // Common selector for node labels
            
            if (rectOrMainShape && textEl) {
              const nodeTextContent = textEl.textContent?.trim() || null;
              if (nodeTextContent) {
                (rectOrMainShape as HTMLElement).style.cursor = 'pointer';
                
                // Prevent duplicate listeners if re-rendering frequently
                const clickHandler = () => {
                  setHighlightedNodeText(nodeTextContent);
                };
                
                // Store and remove old listener if any
                const oldListener = (rectOrMainShape as any)._clickHandler;
                if(oldListener) rectOrMainShape.removeEventListener('click', oldListener);
                
                rectOrMainShape.addEventListener('click', clickHandler);
                (rectOrMainShape as any)._clickHandler = clickHandler;

              }
            }
          });
          setIsDiagramLoaded(true);
        } catch (e: any) {
          console.error('Mermaid rendering error:', e);
          if (diagramContainerRef.current) {
            diagramContainerRef.current.innerHTML = `<p class="text-destructive">Error rendering diagram: ${e.message || 'Unknown error'}</p>`;
          }
          setMermaidSvgElement(null);
          setIsDiagramLoaded(false);
        }
      } else if (!mermaidSyntax && diagramContainerRef.current) {
        diagramContainerRef.current.innerHTML = ''; // Clear if no syntax
        setMermaidSvgElement(null);
        setIsDiagramLoaded(false);
      }
    };

    renderDiagram();
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
          
          // Reset styles first
          (rectOrMainShape as SVGElement).style.fill = ''; // Use Mermaid's default or theme variable
          (rectOrMainShape as SVGElement).style.stroke = ''; // Use Mermaid's default or theme variable
          (rectOrMainShape as SVGElement).style.strokeWidth = ''; // Use Mermaid's default

          if (isHighlighted) {
            (rectOrMainShape as SVGElement).style.fill = 'hsl(var(--accent))'; // Bright Violet
            (rectOrMainShape as SVGElement).style.stroke = 'hsl(var(--primary))'; // Indigo
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
        {error && !isLoading && (
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
        <div
          ref={diagramContainerRef}
          id="mermaid-diagram-container"
          className={`w-full h-full min-h-[300px] transition-opacity duration-500 ${isDiagramLoaded ? 'opacity-100' : 'opacity-0'}`}
          aria-live="polite"
        >
          {/* Mermaid diagram will be rendered here */}
          {!isLoading && !error && mermaidSyntax && !isDiagramLoaded && (
             <div className="w-full h-full flex items-center justify-center">
                <Skeleton className="w-full h-[calc(100%-2rem)] rounded-md" />
             </div>
          )}
        </div>
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
