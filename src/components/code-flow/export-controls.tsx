'use client';

import type React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ExportControlsProps {
  mermaidSyntax: string | null;
  getMermaidSvgElement: () => SVGElement | null;
}

export function ExportControls({ mermaidSyntax, getMermaidSvgElement }: ExportControlsProps) {
  const { toast } = useToast();

  const downloadFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleDownloadMmd = () => {
    if (!mermaidSyntax) {
      toast({ title: "Error", description: "No diagram content to export.", variant: "destructive" });
      return;
    }
    downloadFile('diagram.mmd', mermaidSyntax, 'text/plain;charset=utf-8');
    toast({ title: "Success", description: "Mermaid .mmd file downloaded." });
  };

  const handleDownloadPng = () => {
    const svgElement = getMermaidSvgElement();
    if (!svgElement) {
      toast({ title: "Error", description: "No diagram rendered to export as PNG.", variant: "destructive" });
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        toast({ title: "Error", description: "Could not create canvas context for PNG export.", variant: "destructive" });
        return;
    }

    const img = new Image();
    img.onload = () => {
      // Set canvas dimensions based on SVG, consider viewBox for scaling
      const viewBox = svgElement.getAttribute('viewBox');
      let svgWidth = img.width;
      let svgHeight = img.height;

      if (viewBox) {
        const [, , vbWidth, vbHeight] = viewBox.split(' ').map(parseFloat);
        svgWidth = vbWidth;
        svgHeight = vbHeight;
      } else {
         // Fallback if no viewBox, try to get width/height attributes
        const widthAttr = svgElement.getAttribute('width');
        const heightAttr = svgElement.getAttribute('height');
        if (widthAttr) svgWidth = parseFloat(widthAttr);
        if (heightAttr) svgHeight = parseFloat(heightAttr);
      }
      
      // Ensure minimum dimensions and reasonable scaling
      canvas.width = Math.max(svgWidth * 2, 600); // Scale up for better quality, min width 600
      canvas.height = Math.max(svgHeight * 2, 400); // Scale up, min height 400
      
      // Fill background for transparency
      ctx.fillStyle = 'hsl(var(--background))'; // Use app background color
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Calculate scaling to fit image onto canvas while maintaining aspect ratio
      const hRatio = canvas.width / img.width;
      const vRatio = canvas.height / img.height;
      const ratio = Math.min(hRatio, vRatio, 2); // Cap scaling at 2x original size

      const centerShiftX = (canvas.width - img.width * ratio) / 2;
      const centerShiftY = (canvas.height - img.height * ratio) / 2;
      
      ctx.drawImage(img, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);

      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = 'diagram.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Success", description: "Diagram PNG downloaded." });
    };
    img.onerror = () => {
        toast({ title: "Error", description: "Failed to load SVG image for PNG export.", variant: "destructive" });
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const isDisabled = !mermaidSyntax;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="border-primary-foreground/50 hover:bg-primary-foreground/10 text-primary-foreground" disabled={isDisabled}>
          <Download className="mr-2 h-4 w-4" /> Export Diagram
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border-border shadow-lg">
        <DropdownMenuItem onClick={handleDownloadPng} disabled={!getMermaidSvgElement()}>
          <Download className="mr-2 h-4 w-4" /> Download as PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadMmd}>
          <FileText className="mr-2 h-4 w-4" /> Download as .mmd
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
