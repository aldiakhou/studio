
'use client';

import type React from 'react';
import { useState, useCallback, useRef } from 'react';
import { AppHeader } from '@/components/code-flow/app-header';
import { CodeEditor } from '@/components/code-flow/code-editor';
import { MermaidViewer } from '@/components/code-flow/mermaid-viewer';
import { generateMermaidDiagramAction } from './actions';
import { useToast } from '@/hooks/use-toast';
import type { GenerateMermaidDiagramOutput, GenerateMermaidDiagramInput } from '@/ai/flows/generate-mermaid-diagram';

interface UploadedFile {
  path: string;
  content: string;
}

const MAX_RETRIES = 2; // Max number of retries (e.g., 2 retries means 3 total attempts)
const RETRY_DELAY_MS = 3000; // Delay between retries in milliseconds

export default function CodeFlowPage() {
  const [code, setCode] = useState<string>('');
  const [uploadedFolderFiles, setUploadedFolderFiles] = useState<UploadedFile[] | null>(null);
  const [mermaidSyntax, setMermaidSyntax] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedNodeText, setHighlightedNodeText] = useState<string | null>(null);
  
  const mermaidSvgElementRef = useRef<SVGElement | null>(null);

  const getMermaidSvgElement = useCallback(() => mermaidSvgElementRef.current, []);
  const setMermaidSvgElement = useCallback((element: SVGElement | null) => {
    mermaidSvgElementRef.current = element;
  }, []);

  const { toast } = useToast();

  const handleFolderSelect = (files: UploadedFile[] | null) => {
    setUploadedFolderFiles(files);
    if (files && files.length > 0) {
      setCode(`Folder uploaded: ${files.length} file${files.length > 1 ? 's' : ''} ready for analysis.\n\n${files.slice(0, 5).map(f => `- ${f.path}`).join('\n')}${files.length > 5 ? '\n...' : ''}`);
    } else if (code.startsWith("Folder uploaded:")) { // Clear message if folder is deselected or single file loaded
      setCode("");
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (uploadedFolderFiles) { // If user types in editor, assume they are switching from folder to single code input
      setUploadedFolderFiles(null);
    }
  }

  const handleGenerateDiagram = async () => {
    let input: GenerateMermaidDiagramInput;

    if (uploadedFolderFiles && uploadedFolderFiles.length > 0) {
      input = { files: uploadedFolderFiles };
    } else if (code.trim()) {
      input = { files: [{ path: 'input_code.txt', content: code }] };
    } else {
      toast({
        title: 'Input Required',
        description: 'Please enter some code or upload a file/folder to generate a diagram.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setMermaidSyntax(null); 
    setHighlightedNodeText(null);

    let attempts = 0;
    let operationSuccessful = false;
    let lastError: any = null;

    while (attempts <= MAX_RETRIES && !operationSuccessful) {
      try {
        const result = await generateMermaidDiagramAction(input) as GenerateMermaidDiagramOutput & { error?: string };
        
        if (result.error) {
          const errorMessage = result.error;
          const isRetryable = (errorMessage.includes('503') || errorMessage.toLowerCase().includes('overloaded') || errorMessage.toLowerCase().includes('try again later'));

          if (isRetryable && attempts < MAX_RETRIES) {
            attempts++;
            lastError = new Error(errorMessage);
            toast({
              title: `Attempt ${attempts} Failed (Model Overloaded)`,
              description: `Retrying in ${RETRY_DELAY_MS / 1000}s... (Attempt ${attempts + 1}/${MAX_RETRIES + 1})`,
              variant: 'default',
            });
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            continue; // Next attempt
          }
          throw new Error(errorMessage); // Non-retryable error or max retries reached
        }

        if (result.mermaidDiagram) {
          setMermaidSyntax(result.mermaidDiagram);
          toast({
            title: 'Diagram Generated',
            description: 'Mermaid diagram successfully created.',
          });
          operationSuccessful = true;
          lastError = null; // Clear error on success
        } else {
          throw new Error('AI did not return a diagram. Try modifying your input or prompt.');
        }
      } catch (e: any) {
        lastError = e;
        const message = e.message || 'An unknown error occurred.';
        const isRetryable = (message.includes('503') || message.toLowerCase().includes('overloaded') || message.toLowerCase().includes('try again later'));

        if (isRetryable && attempts < MAX_RETRIES) {
          attempts++;
          toast({
            title: `Attempt ${attempts} Failed (Service Unavailable)`,
            description: `Retrying in ${RETRY_DELAY_MS / 1000}s... (Attempt ${attempts + 1}/${MAX_RETRIES + 1})`,
            variant: 'default',
          });
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          continue; // Next attempt
        }
        // Non-retryable error or max retries reached from direct exception
        break; // Exit loop, will be handled by final error check
      }
    }

    if (!operationSuccessful && lastError) {
      console.error('Error generating diagram after retries:', lastError);
      const finalErrorMessage = lastError.message || 'Failed to generate diagram after multiple attempts. Please try again later.';
      setError(finalErrorMessage);
      setMermaidSyntax(null);
      toast({
        title: 'Generation Failed',
        description: finalErrorMessage,
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader 
        mermaidSyntax={mermaidSyntax}
        getMermaidSvgElement={getMermaidSvgElement}
      />
      <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="h-full min-h-[calc(100vh-200px)] md:min-h-0">
          <CodeEditor
            code={code}
            setCode={handleCodeChange}
            onGenerate={handleGenerateDiagram}
            isLoading={isLoading}
            highlightedTerm={highlightedNodeText}
            onFolderSelect={handleFolderSelect}
          />
        </div>
        <div className="h-full min-h-[calc(100vh-200px)] md:min-h-0">
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
