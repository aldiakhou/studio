'use client';

import type React from 'react';
import { ChangeEvent, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { UploadCloud, Play, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
  highlightedTerm: string | null;
}

export function CodeEditor({ code, setCode, onGenerate, isLoading, highlightedTerm }: CodeEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCode(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="h-full flex flex-col shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Code Input</CardTitle>
        <CardDescription>Paste your code or upload a file.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4">
        <div className="flex-grow">
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter your code here..."
            className="w-full h-full min-h-[300px] resize-none font-code text-sm rounded-md shadow-inner"
            aria-label="Code Input Area"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <Button onClick={triggerFileInput} variant="outline" className="w-full sm:w-auto">
            <UploadCloud className="mr-2 h-4 w-4" /> Upload File
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".js,.ts,.jsx,.tsx,.py,.java,.c,.cpp,.cs,.go,.rs,.php,.rb,.swift,.kt,.html,.css,.json,.*"
          />
          <Button onClick={onGenerate} disabled={isLoading || !code.trim()} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Generate Diagram
          </Button>
        </div>
        {highlightedTerm && (
          <div className="mt-2 p-2 border border-dashed border-accent rounded-md bg-accent/10">
            <p className="text-sm text-accent-foreground font-medium">
              <span className="font-semibold">Inspecting in diagram:</span> <span className="font-code bg-background px-1 rounded">{highlightedTerm}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
