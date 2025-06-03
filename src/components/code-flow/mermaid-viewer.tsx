
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
    if (typeof window === 'undefined' || mermaidInitialized) return;

    const getResolvedColor = (variableName: string, fallback: string): string => {
      const style = getComputedStyle(document.documentElement);
      const value = style.getPropertyValue(variableName).trim();
      if (value) {
        // Check if it's already a direct color value (hex, rgb, hsl)
        if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) {
          return value;
        }
        // Assuming HSL parts if it's not a direct color
        const hslParts = value.split(' ').map(s => s.trim().replace('%', ''));
        if (hslParts.length === 3) {
          return `hsl(${hslParts[0]}, ${hslParts[1]}%, ${hslParts[2]}%)`;
        }
      }
      return fallback;
    };

    try {
      const primaryColor = getResolvedColor('--primary', '#4B0082');
      const backgroundColor = getResolvedColor('--background', '#F5F5F5');
      const foregroundColor = getResolvedColor('--foreground', '#0A0A0A');
      const accentColor = getResolvedColor('--accent', '#EE82EE');
      const cardColor = getResolvedColor('--card', '#FFFFFF');
      const primaryBorderColor = getResolvedColor('--border', primaryColor); // Use border or fallback to primary
      const lineColor = primaryColor;

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
          nodeSpacing: 70, // Increased
          rankSpacing: 70, // Increased
          htmlLabels: false,
          useMaxWidth: false,
        },
        themeVariables: {
          primaryColor: backgroundColor,
          primaryTextColor: foregroundColor,
          primaryBorderColor: primaryBorderColor,
          lineColor: lineColor,
          secondaryColor: accentColor,
          tertiaryColor: cardColor,
          fontSize: '16px', // Increased
          background: backgroundColor,
          mainBkg: accentColor,
          textColor: foregroundColor,
          nodeBorder: primaryBorderColor,
          clusterBkg: cardColor,
          clusterBorder: primaryBorderColor,
          defaultLinkColor: lineColor,
          titleColor: foregroundColor,
          edgeLabelBackground: backgroundColor,
        }
      });
      setMermaidInitialized(true);
    } catch (e: any) {
       console.error("Mermaid initialization error:", e);
       setInternalError(`Mermaid Init Error: ${e.message}`);
    }
  }, [mermaidInitialized]);

  useEffect(() => {
    if (!mermaidInitialized) return;

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
        container.innerHTML = ''; // Clear previous diagram

        const { svg, bindFunctions } = await mermaid.render('mermaid-diagram-svg', mermaidSyntax);

        if (!isMounted || !diagramContainerRef.current) return;

        diagramContainerRef.current.innerHTML = svg;
        const svgElement = diagramContainerRef.current.querySelector('svg');

        if (isMounted) {
          setMermaidSvgElement(svgElement as SVGElement | null);
        }

        if (bindFunctions) {
          bindFunctions(diagramContainerRef.current);
        }

        const interactiveElements = diagramContainerRef.current.querySelectorAll('g.node, g.cluster .cluster-title, g.cluster > rect');
        interactiveElements.forEach(el => {
          const nodeElement = el.closest('.node, .cluster');
          if (!nodeElement) return;

          let textContentElement = nodeElement.querySelector('.nodeLabel, .cluster-title tspan, .edgeLabel, foreignObject div');
          if (el.tagName.toLowerCase() === 'rect' && nodeElement.classList.contains('cluster')) {
             textContentElement = nodeElement.querySelector('.cluster-title tspan');
          }

          if (textContentElement) {
            const nodeTextContent = textContentElement.textContent?.trim() || null;
            if (nodeTextContent) {
              (el as HTMLElement).style.cursor = 'pointer';
              const clickHandler = (event: Event) => {
                event.stopPropagation();
                if (isMounted) setHighlightedNodeText(nodeTextContent);
              };
              const oldListener = (el as any)._clickHandler;
              if (oldListener) el.removeEventListener('click', oldListener);
              el.addEventListener('click', clickHandler);
              (el as any)._clickHandler = clickHandler;
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
             diagramContainerRef.current.innerHTML = `<p class="text-destructive p-4">Error rendering diagram. Details: ${e.message || 'Unknown'}</p>`;
           }
        }
      }
    };

    if (mermaidSyntax) {
      renderFn();
    } else {
        if (diagramContainerRef.current) {
            diagramContainerRef.current.innerHTML = '';
        }
        if (isMounted) { // Ensure isMounted check
          setMermaidSvgElement(null);
          setIsDiagramLoaded(false);
        }
    }

    return () => {
      isMounted = false;
      if (diagramContainerRef.current) {
        const interactiveElements = diagramContainerRef.current.querySelectorAll('g.node, g.cluster .cluster-title, g.cluster > rect');
        interactiveElements.forEach(el => {
          if ((el as any)._clickHandler) {
            el.removeEventListener('click', (el as any)._clickHandler);
            delete (el as any)._clickHandler;
          }
        });
      }
    };
  }, [mermaidSyntax, setMermaidSvgElement, setHighlightedNodeText, mermaidInitialized]);


  useEffect(() => {
    const svgToUpdate = getMermaidSvgElement();
    if (svgToUpdate && mermaidInitialized && typeof window !== 'undefined') {
      const allElements = svgToUpdate.querySelectorAll('g.node, g.cluster');

      const getResolvedColorForHighlight = (variableName: string, fallback: string): string => {
          const style = getComputedStyle(document.documentElement);
          const value = style.getPropertyValue(variableName).trim();
          if (value) {
            if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) return value;
            const hslParts = value.split(' ').map(s => s.trim().replace('%', ''));
            if (hslParts.length === 3) return `hsl(${hslParts[0]}, ${hslParts[1]}%, ${hslParts[2]}%)`;
          }
          return fallback;
      };
      
      const resolvedAccentColor = getResolvedColorForHighlight('--accent', '#EE82EE');
      const resolvedPrimaryColor = getResolvedColorForHighlight('--primary', '#4B0082');
      const resolvedAccentFgColor = getResolvedColorForHighlight('--accent-foreground', '#000000');
      const defaultNodeStroke = getResolvedColorForHighlight('--border', resolvedPrimaryColor);
      const defaultNodeFill = getResolvedColorForHighlight('--card', 'transparent');
      const defaultNodeTextColor = getResolvedColorForHighlight('--foreground', '#0A0A0A');


      allElements.forEach(el => {
        const mainShape = el.querySelector('rect, circle, polygon, ellipse, path.node-shape, .label-container');
        const textElements = el.querySelectorAll('.nodeLabel, .cluster-title tspan, text, tspan, foreignObject div');
        let nodeTextContent : string | null = null;

        if (el.classList.contains('cluster')) {
            const titleTspan = el.querySelector('.cluster-title tspan');
            if (titleTspan) nodeTextContent = titleTspan.textContent?.trim() || null;
        } else {
            const nodeLabel = el.querySelector('.nodeLabel, foreignObject div');
            if (nodeLabel) nodeTextContent = nodeLabel.textContent?.trim() || null;
        }
        
        const isHighlighted = nodeTextContent && nodeTextContent === highlightedNodeText;

        if (mainShape) {
          (mainShape as SVGElement).style.fill = isHighlighted ? resolvedAccentColor : defaultNodeFill;
          (mainShape as SVGElement).style.stroke = isHighlighted ? resolvedPrimaryColor : defaultNodeStroke;
          (mainShape as SVGElement).style.strokeWidth = isHighlighted ? '3px' : '1.5px';
        }

        textElements.forEach(txtEl => {
          (txtEl as SVGElement).style.fill = isHighlighted ? resolvedAccentFgColor : defaultNodeTextColor;
        });
      });
    }
  }, [highlightedNodeText, getMermaidSvgElement, mermaidInitialized]);

  const displayError = error || internalError;

  return (
    <Card className="h-full flex flex-col shadow-lg rounded-lg overflow-hidden">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Diagram View</CardTitle>
        <CardDescription>Visual representation of your code. Click nodes or file names to highlight and inspect.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center bg-card relative p-2 sm:p-4 overflow-auto">
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
            {(!isDiagramLoaded || !mermaidInitialized) && !internalError && (
              <div className="w-full h-full flex items-center justify-center">
                  <Skeleton className="w-full h-[calc(100%-2rem)] rounded-md" />
              </div>
            )}
            <div
              ref={diagramContainerRef}
              id="mermaid-diagram-container"
              className={`w-full h-full transition-opacity duration-300 flex justify-center items-start ${isDiagramLoaded && mermaidInitialized ? 'opacity-100' : 'opacity-0'}`}
              aria-live="polite"
              style={{ visibility: (isDiagramLoaded && mermaidInitialized && !internalError) ? 'visible' : 'hidden' }}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

