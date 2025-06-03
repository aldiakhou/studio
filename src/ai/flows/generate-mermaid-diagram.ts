
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating Mermaid diagrams from project files.
 *
 * - generateMermaidDiagram - A function that takes project files as input and returns a Mermaid diagram.
 * - GenerateMermaidDiagramInput - The input type for the generateMermaidDiagram function.
 * - GenerateMermaidDiagramOutput - The return type for the generateMermaidDiagram function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FileSchema = z.object({
  path: z.string().describe('The relative path of the file within the project.'),
  content: z.string().describe('The content of the file. May be truncated or summarized for large/binary files.'),
});

const GenerateMermaidDiagramInputSchema = z.object({
  files: z.array(FileSchema).describe('An array of files in the project, each with its path and content.'),
});
export type GenerateMermaidDiagramInput = z.infer<typeof GenerateMermaidDiagramInputSchema>;

const GenerateMermaidDiagramOutputSchema = z.object({
  mermaidDiagram: z.string().describe('The Mermaid diagram representing the project structure and relationships.'),
});
export type GenerateMermaidDiagramOutput = z.infer<typeof GenerateMermaidDiagramOutputSchema>;

export async function generateMermaidDiagram(input: GenerateMermaidDiagramInput): Promise<GenerateMermaidDiagramOutput> {
  return generateMermaidDiagramFlow(input);
}

const generateMermaidDiagramPrompt = ai.definePrompt({
  name: 'generateMermaidDiagramPrompt',
  input: {schema: GenerateMermaidDiagramInputSchema},
  output: {schema: GenerateMermaidDiagramOutputSchema},
  prompt: `You are an expert at creating Mermaid diagrams to visualize code project structures.
Based on the project files provided below, generate a single Mermaid diagram that represents the overall structure.
This includes files, folders (derived from paths), and important relationships or dependencies between them (e.g., imports, function calls if discernible).

Focus on clarity and a high-level overview. If the project is very large or file content is summarized/skipped, make reasonable inferences.
Do not try to represent every single line of code or minor detail. Create a diagram that is informative and readable.
Consider using subgraphs for folders if appropriate.

Project Files:
{{#each files}}
---
File Path: {{{this.path}}}
Content:
{{{this.content}}}
---
{{/each}}

The diagram should be a valid Mermaid graph (e.g., graph TD, graph LR) or flowchart.
Ensure the output is only the Mermaid syntax for the diagram.
Diagram:
  `,
});

const generateMermaidDiagramFlow = ai.defineFlow(
  {
    name: 'generateMermaidDiagramFlow',
    inputSchema: GenerateMermaidDiagramInputSchema,
    outputSchema: GenerateMermaidDiagramOutputSchema,
  },
  async input => {
    // Basic validation: Ensure there are files to process
    if (!input.files || input.files.length === 0) {
      throw new Error("No files provided for diagram generation.");
    }
    // Potentially, further pre-processing of files input could happen here if needed.
    // For example, if contents are too long, summarize them before sending to the prompt,
    // though the current prompt implies this might already be handled by the client.

    const {output} = await generateMermaidDiagramPrompt(input);
    if (!output?.mermaidDiagram) {
      throw new Error("AI failed to generate a Mermaid diagram. The output was empty or invalid.");
    }
    return output;
  }
);

