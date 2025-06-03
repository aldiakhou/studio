
'use client';

import type React from 'react';
import { ChangeEvent, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { UploadCloud, Play, Loader2, FolderOpen, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


interface UploadedFile {
  path: string;
  content: string;
}

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
  highlightedTerm: string | null;
  onFolderSelect: (files: UploadedFile[] | null) => void;
  isFolderUploaded: boolean;
}

const MAX_FILES_TO_PROCESS = 50;
const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1MB
const IGNORED_FOLDERS = ['node_modules', '.git', '.vscode', 'dist', 'build', '__pycache__', '.next', 'out'];
const IGNORED_EXTENSIONS = ['.log', '.lock', '.DS_Store', '.env', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.zip', '.tar', '.gz', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.exe', '.dll', '.so', '.class', '.pyc'];

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      resolve(`// File content skipped: Exceeds size limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`);
      return;
    }
    if (IGNORED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))) {
      resolve(`// File content skipped: Ignored file type (${file.name}).`);
      return;
    }
    if (file.type && !(file.type.startsWith('text/') || ['application/json', 'application/javascript', 'application/xml', 'application/typescript'].includes(file.type) || file.name.endsWith('.md'))) {
        if (file.type !== 'application/octet-stream') { 
             resolve(`// File content skipped: Likely binary or non-text file type (${file.type}).`);
             return;
        }
    }


    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error('Unknown FileReader error'));
    reader.readAsText(file);
  });
};


export function CodeEditor({ code, setCode, onGenerate, isLoading, highlightedTerm, onFolderSelect, isFolderUploaded }: CodeEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFiles = async (selectedFiles: FileList | null, isFolder: boolean) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (isFolder) {
      const projectFilesArray: UploadedFile[] = [];
      let filesAttempted = 0;
      let filesSkippedBySize = 0;
      let filesSkippedByIgnoredPath = 0;
      let filesReadSuccessfully = 0;

      for (const file of Array.from(selectedFiles)) {
        if (filesAttempted >= MAX_FILES_TO_PROCESS) {
          toast({ title: "Folder Upload", description: `Reached processing limit of ${MAX_FILES_TO_PROCESS} files. Some files were skipped.`, variant: "default" });
          break;
        }
        filesAttempted++;

        const filePath = file.webkitRelativePath || file.name;
        if (IGNORED_FOLDERS.some(folder => filePath.includes(`/${folder}/`)) || IGNORED_FOLDERS.some(folder => filePath.startsWith(folder + '/')) || IGNORED_FOLDERS.includes(filePath.split('/')[0])) {
          filesSkippedByIgnoredPath++;
          continue;
        }
         if (file.size > MAX_FILE_SIZE_BYTES) {
          filesSkippedBySize++;
          projectFilesArray.push({ path: filePath, content: `// File content skipped: Exceeds size limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`});
          continue;
        }


        try {
          const content = await readFileAsText(file);
          projectFilesArray.push({ path: filePath, content });
          filesReadSuccessfully++;
        } catch (err: any) {
          projectFilesArray.push({ path: filePath, content: `// Error reading file: ${err.message}` });
        }
      }

      if (projectFilesArray.length > 0) {
        onFolderSelect(projectFilesArray);
        toast({
          title: "Folder Processed",
          description: `${filesReadSuccessfully} files ready. ${filesSkippedByIgnoredPath} skipped (ignored paths). ${filesSkippedBySize} skipped (size).`,
        });
      } else {
        // setCode("No suitable files found in the selected folder or processing limit reached early.");
        onFolderSelect(null); // Ensure this is called to reset folder state
        toast({ title: "Folder Upload", description: "No suitable files found or all files were filtered out.", variant: "destructive" });
      }
    } else if (selectedFiles.length === 1) { 
      const file = selectedFiles[0];
       if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ title: "File Upload", description: `File is too large (max ${MAX_FILE_SIZE_BYTES / (1024*1024)}MB).`, variant: "destructive" });
        // setCode(`// File too large: ${file.name}`);
        onFolderSelect(null);
        return;
      }
      try {
        const content = await readFileAsText(file);
        setCode(content);
        onFolderSelect(null); 
      } catch (err: any) {
        toast({ title: "File ReadError", description: `Could not read file: ${err.message}`, variant: "destructive" });
        // setCode(`// Error reading file: ${file.name}`);
        onFolderSelect(null);
      }
    }
  };

  const handleFileEvent = (event: ChangeEvent<HTMLInputElement>, isFolder: boolean) => {
    handleFiles(event.target.files, isFolder);
    if (event.target) { 
      event.target.value = '';
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();
  const triggerFolderInput = () => folderInputRef.current?.click();
  
  const isAnalyzingFolder = isFolderUploaded && code.startsWith("Folder uploaded:");
  const isAnalyzingSinglePastedFile = !isFolderUploaded && code.trim() !== "" && !code.startsWith("Folder uploaded:");
  const isDisplayingSelectedFile = isFolderUploaded && !code.startsWith("Folder uploaded:");


  return (
    <Card className="h-full flex flex-col shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Code Input</CardTitle>
        <CardDescription>Paste your code, upload a file, or upload a project folder.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4">
        {isDisplayingSelectedFile && highlightedTerm && (
          <Alert variant="default" className="mb-2 bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 !text-blue-700" />
            <AlertTitle className="text-blue-800">Viewing File Content</AlertTitle>
            <AlertDescription className="text-blue-700">
              Displaying content for <span className="font-semibold font-code">{highlightedTerm}</span>. Edit or upload a new folder to analyze different code.
            </AlertDescription>
          </Alert>
        )}
        <div className="flex-grow">
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter your code here, or upload a file/folder..."
            className="w-full h-full min-h-[300px] resize-none font-code text-sm rounded-md shadow-inner"
            aria-label="Code Input Area"
            readOnly={isDisplayingSelectedFile} // Make readonly if showing a selected file from folder
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <Button onClick={triggerFileInput} variant="outline" className="w-full sm:w-auto">
            <UploadCloud className="mr-2 h-4 w-4" /> Upload File
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileEvent(e, false)}
            className="hidden"
            accept=".js,.ts,.jsx,.tsx,.py,.java,.c,.cpp,.cs,.go,.rs,.php,.rb,.swift,.kt,.html,.css,.json,.md,.*"
          />
          <Button onClick={triggerFolderInput} variant="outline" className="w-full sm:w-auto">
            <FolderOpen className="mr-2 h-4 w-4" /> Upload Folder
          </Button>
          <input
            type="file"
            ref={folderInputRef}
            onChange={(e) => handleFileEvent(e, true)}
            className="hidden"
            // @ts-ignore
            webkitdirectory=""
            directory=""
          />
          <Button 
            onClick={onGenerate} 
            disabled={isLoading || (!code.trim() && !isFolderUploaded) || (code.trim() && !isAnalyzingFolder && !isAnalyzingSinglePastedFile && !isDisplayingSelectedFile) } 
            className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Generate Diagram
          </Button>
        </div>
        {highlightedTerm && !isDisplayingSelectedFile && (
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

