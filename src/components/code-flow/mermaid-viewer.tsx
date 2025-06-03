
'use client';

import mermaid from 'mermaid';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Loader2 } from 'lucide-react';
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
  const [mermaidInitialized, setMermaidInitialized] = useState(false);


  useEffect(() => {
    if (mermaidInitialized) return;

    const getResolvedColor = (variableName: string, fallback: string): string => {
      if (typeof window !== 'undefined') {
        const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
        if (value) {
          // Check if it's already a full hsl/rgb string or hex
          if (value.startsWith('hsl(') || value.startsWith('rgb(') || value.startsWith('#')) {
            return value;
          }
          // Assuming it's HSL components like "271 100% 25%"
          return `hsl(${value})`;
        }
      }
      return fallback;
    };

    const primaryColor = getResolvedColor('--primary', '#4B0082'); // Fallback to Indigo
    const backgroundColor = getResolvedColor('--background', '#F5F5F5'); // Fallback to light grey
    const foregroundColor = getResolvedColor('--foreground', '#0A0A0A'); // Fallback to dark text
    const accentColor = getResolvedColor('--accent', '#EE82EE'); // Fallback to bright violet
    const cardColor = getResolvedColor('--card', '#FFFFFF'); // Fallback to white
    const primaryBorderColor = primaryColor; 
    const lineColor = primaryColor;

    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral', // 'neutral' or 'base' are good starting points with themeVariables
      securityLevel: 'loose',
      dompurifyConfig: {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_TAGS: ['foreignobject'],
        ADD_ATTR: ['style', 'id', 'class'],
      },
      flowchart: {
        nodeSpacing: 60,
        rankSpacing: 60,
        htmlLabels: false, // Keep this false for simplicity with AI output
      },
      themeVariables: {
        primaryColor: backgroundColor, 
        primaryTextColor: foregroundColor,
        primaryBorderColor: primaryBorderColor,
        lineColor: lineColor,
        secondaryColor: accentColor, 
        tertiaryColor: cardColor, 
        fontSize: '14px',
        background: backgroundColor,
        mainBkg: accentColor, // Often used for highlighted elements or specific node types
        textColor: foregroundColor,
        // Mermaid specific theme variables that might need mapping:
        nodeBorder: primaryBorderColor,
        clusterBkg: getResolvedColor('--card', '#FFFFFF'), // card color slightly adjusted
        clusterBorder: primaryBorderColor,
        defaultLinkColor: lineColor,
        titleColor: foregroundColor,
        edgeLabelBackground: backgroundColor,
        
        // Colors for specific node states if needed
        // colorیان: '#FF0000', // Example
      }
    });
    setMermaidInitialized(true);
  }, [mermaidInitialized]);

  useEffect(() => {
    if (!mermaidInitialized) return; // Don't render if mermaid isn't initialized

    let isMounted = true;
    setInternalError(null); 

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
          const rectOrMainShape = nodeEl.querySelector('rect, circle, polygon, ellipse, path.node-shape, .label-container'); 
          const textEl = nodeEl.querySelector('.nodeLabel, text, tspan, .edgeLabel, foreignObject div'); 
          
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
           if (diagramContainerRef.current) { 
             diagramContainerRef.current.innerHTML = '<p class="text-destructive-foreground">Error rendering diagram. Check console.</p>';
           }
        }
      }
    };

    if (mermaidSyntax) { 
      renderFn();
    } else { // If no syntax, ensure the container is cleared and state is reset
        if (diagramContainerRef.current) {
            diagramContainerRef.current.innerHTML = '';
        }
        setMermaidSvgElement(null);
        setIsDiagramLoaded(false);
    }
    

    return () => {
      isMounted = false;
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
  }, [mermaidSyntax, setMermaidSvgElement, setHighlightedNodeText, mermaidInitialized]);


  useEffect(() => {
    const svgToUpdate = getMermaidSvgElement();
    if (svgToUpdate && mermaidInitialized) { // Only update if mermaid is initialized
      const allNodes = svgToUpdate.querySelectorAll('g.node');
      
      const resolvedAccentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      const resolvedPrimaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
      const resolvedAccentFgColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-foreground').trim();

      allNodes.forEach(nodeEl => {
        const rectOrMainShape = nodeEl.querySelector('rect, circle, polygon, ellipse, path.node-shape, .label-container');
        const textEl = nodeEl.querySelector('.nodeLabel, text, tspan, .edgeLabel, foreignObject div');
        
        if (rectOrMainShape && textEl) {
          const nodeTextContent = textEl.textContent?.trim();
          const isHighlighted = nodeTextContent && nodeTextContent === highlightedNodeText;
          
          (rectOrMainShape as SVGElement).style.fill = ''; 
          (rectOrMainShape as SVGElement).style.stroke = '';
          (rectOrMainShape as SVGElement).style.strokeWidth = '';

          const textElements = nodeEl.querySelectorAll('.nodeLabel, text, tspan');
          textElements.forEach(txt => {
            (txt as SVGElement).style.fill = '';
          });

          if (isHighlighted) {
            (rectOrMainShape as SVGElement).style.fill = `hsl(${resolvedAccentColor})`;
            (rectOrMainShape as SVGElement).style.stroke = `hsl(${resolvedPrimaryColor})`;
            (rectOrMainShape as SVGElement).style.strokeWidth = '3px';
            textElements.forEach(txt => { 
                (txt as SVGElement).style.fill = `hsl(${resolvedAccentFgColor})`;
            });
          }
        }
      });
    }
  }, [highlightedNodeText, getMermaidSvgElement, mermaidInitialized]);

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
            {(!isDiagramLoaded || !mermaidInitialized) && ( // Show skeleton if diagram not loaded OR mermaid not init
              <div className="w-full h-full flex items-center justify-center">
                  <Skeleton className="w-full h-[calc(100%-2rem)] rounded-md" />
              </div>
            )}
            <div
              ref={diagramContainerRef}
              id="mermaid-diagram-container"
              className={`w-full h-full min-h-[300px] transition-opacity duration-300 ${isDiagramLoaded && mermaidInitialized ? 'opacity-100' : 'opacity-0'}`}
              aria-live="polite"
              style={{ visibility: (isDiagramLoaded && mermaidInitialized) ? 'visible' : 'hidden' }} 
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Loader2 component was removed from here as it's imported from lucide-react
// If it's a custom component, ensure it's defined or imported correctly.
// Assuming Loader2 from lucide-react is intended:
// import { Loader2 } from 'lucide-react';

