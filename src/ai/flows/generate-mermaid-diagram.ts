
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
  prompt: `You are an expert at creating detailed and interactive Mermaid diagrams to visualize code project structures.
Based on the project files provided below, generate a single Mermaid diagram that represents the project's architecture and key components.

Your diagram should include:
1.  **File and Folder Structure:**
    *   **CRITICAL: Use Mermaid 'subgraph' blocks for EACH file.** The label for the subgraph MUST be the exact file path enclosed in double quotes (e.g., \`subgraph "src/components/button.tsx"\`).
    *   If there's a clear folder structure, you can optionally nest subgraphs for folders, but individual file subgraphs are essential.
2.  **Key Code Elements (within their file's subgraph):**
    *   **Classes:** Represent as nodes within their file's subgraph. Include their names. If methods are important for understanding, list key method names as part of the class node's label or as separate linked nodes if space permits.
    *   **Functions/Methods:** Represent as nodes within their file's subgraph. Show their names. If concise and crucial, include key parameters and a return type in the label (e.g., \`"calculateTotal(items: Array, discount?: number): number"\`).
    *   **Objects:** Represent significant object instantiations or definitions as nodes if they are central to the structure.
    *   **Variables/Constants:** Depict important module-level or class-level variables/constants as nodes if they play a key role in the structure or logic.
3.  **Relationships:** Clearly show relationships between these elements (both within the same file and across different files), such as:
    *   Function/method calls.
    *   Class inheritance or implementation.
    *   Instantiation of classes.
    *   Import/export dependencies between files/modules (link file subgraphs or nodes within them).

Guidelines for the diagram:
-   **Clarity and Interactivity:** The primary goal is to create a diagram where clicking on a file's subgraph label (the file path) will be used by the application to show that file's content. Therefore, accurate file path labeling for subgraphs is paramount.
-   **Mermaid Syntax and Node Naming - VERY IMPORTANT:**
    *   **Node IDs:** For each element (file subgraph, class, function, etc.), use a simple, unique, **alphanumeric ID** (e.g., \`file1\`, \`classA\`, \`funcB_in_classA\`, \`varX\`). These IDs **MUST NOT** contain spaces, slashes, colons, parentheses, brackets, or any other special characters. Use underscores if needed (e.g., \`src_components_button_tsx\`).
    *   **Node Labels (Display Text):** The descriptive text for a node (e.g., a function signature like \`MyClass.getUser(id: string): User\`) **MUST** be provided as the label part, enclosed in double quotes. Example of defining a node: \`funcA["doSomething(param1: string): void"]\`.
    *   **Subgraph Labels:** As stated, use the file path in quotes: \`subgraph "src/components/button.tsx"\`.
    *   **CRITICAL: All node labels and subgraph labels MUST be single-line.** Do NOT include raw newline characters (e.g., '\\n') or attempt to create multi-line labels by embedding extensive file content, '---' separators, or code snippets directly within a node's or subgraph's quoted label.
    *   Use labels for concise identification, not for embedding large blocks of text or file contents.
    *   Ensure all connections (\`-->\`, \`---\`, etc.) are correctly formatted between the simple alphanumeric IDs.
-   **Focus:** Understand the project's components and how they interact.
-   **Conciseness:** Be concise in labels, especially for parameters and return types.

Project Files:
{{#each files}}
---
File Path: {{{this.path}}}
Content:
{{{this.content}}}
---
{{/each}}

The output should ONLY be the Mermaid syntax for the diagram. Do not include any other text, titles, or explanations outside the Mermaid code block.
Start your diagram with \`graph TD;\` or \`graph LR;\`.

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
    if (!input.files || input.files.length === 0) {
      throw new Error("No files provided for diagram generation.");
    }
    
    const {output} = await generateMermaidDiagramPrompt(input);
    if (!output?.mermaidDiagram) {
      throw new Error("AI failed to generate a Mermaid diagram. The output was empty or invalid.");
    }
    // Basic check for common Mermaid syntax start
    if (!output.mermaidDiagram.trim().match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|requirementDiagram|C4Context|mindmap)/i)) {
        throw new Error("Generated diagram does not start with a valid Mermaid graph type (e.g., graph TD, flowchart LR). The AI returned: " + output.mermaidDiagram.substring(0, 100));
    }
    return output;
  }
);

