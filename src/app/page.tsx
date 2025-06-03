
'use client';

import type React from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
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

const MAX_RETRIES = 2; 
const RETRY_DELAY_MS = 3000; 

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
    } else if (code.startsWith("Folder uploaded:")) { 
      setCode("");
    }
  };

  const handleCodeChange = (newCode: string) => {
    // If user types in editor after a folder was uploaded,
    // we assume they want to analyze the typed code, not the folder.
    if (uploadedFolderFiles && newCode !== code && !newCode.startsWith("Folder uploaded:")) {
      setUploadedFolderFiles(null); 
    }
    setCode(newCode);
  }

  useEffect(() => {
    if (highlightedNodeText && uploadedFolderFiles && uploadedFolderFiles.length > 0) {
      // Attempt to find if the highlighted text is a file path from a subgraph label
      const potentialPath = highlightedNodeText; // Assuming label is just the path
      const foundFile = uploadedFolderFiles.find(f => f.path === potentialPath);

      if (foundFile) {
        // If the user has manually edited the "Folder uploaded..." message, preserve it.
        // Otherwise, show the content of the selected file.
        if (code.startsWith("Folder uploaded:") || (uploadedFolderFiles && uploadedFolderFiles.some(upFile => upFile.path === potentialPath)) ) {
           setCode(foundFile.content);
           toast({
             title: "File Loaded in Editor",
             description: `Displaying content for: ${foundFile.path}`,
           });
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedNodeText, uploadedFolderFiles]); // setCode and toast are stable

  const handleGenerateDiagram = async () => {
    let input: GenerateMermaidDiagramInput;

    if (uploadedFolderFiles && uploadedFolderFiles.length > 0) {
      input = { files: uploadedFolderFiles };
    } else if (code.trim() && !code.startsWith("Folder uploaded:")) { // Ensure it's not just the placeholder message
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
    // setHighlightedNodeText(null); // Keep highlighted node if user re-generates

    let attempts = 0;
    let operationSuccessful = false;
    let lastError: Error | null = null;

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
            continue; 
          } else { 
            lastError = new Error(errorMessage);
            operationSuccessful = false; 
            break; 
          }
        } else if (result.mermaidDiagram) {
          setMermaidSyntax(result.mermaidDiagram);
          toast({
            title: 'Diagram Generated',
            description: 'Mermaid diagram successfully created.',
          });
          operationSuccessful = true;
          lastError = null; 
        } else { 
          lastError = new Error('AI did not return a diagram. Try modifying your input or prompt.');
          operationSuccessful = false;
          break; 
        }
      } catch (e: any) { 
        lastError = e instanceof Error ? e : new Error(String(e.message || e)); 
        const message = lastError.message || 'An unknown error occurred.';
        const isRetryableDirectError = (message.includes('503') || message.toLowerCase().includes('overloaded') || message.toLowerCase().includes('try again later'));

        if (isRetryableDirectError && attempts < MAX_RETRIES) {
          attempts++;
          toast({
            title: `Attempt ${attempts} Failed (Service Unavailable)`,
            description: `Retrying in ${RETRY_DELAY_MS / 1000}s... (Attempt ${attempts + 1}/${MAX_RETRIES + 1})`,
            variant: 'default',
          });
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          continue; 
        }
        operationSuccessful = false;
        break; 
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
            isFolderUploaded={!!uploadedFolderFiles && uploadedFolderFiles.length > 0}
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

