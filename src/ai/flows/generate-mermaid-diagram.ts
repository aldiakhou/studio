
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
    *   **CRITICAL: Each file MUST be represented by a Mermaid 'subgraph' block.** Each subgraph declaration MUST follow this specific pattern: \`subgraph unique_file_id ["Full/File/Path.extension"]\`.
        *   The \`unique_file_id\` part must be a simple alphanumeric string (underscores allowed, e.g., \`file1_utils_ts\`, \`component_button_jsx\`). It must be unique for each file and MUST NOT contain spaces, slashes, colons, parentheses, brackets, or any other special characters.
        *   The \`["Full/File/Path.extension"]\` part is the display label and MUST be the exact file path enclosed in double quotes. This label is for display purposes and MUST be single-line.

2.  **Key Code Elements (within their file's subgraph):**
    *   **Classes:** Represent as nodes within their file's subgraph. Include their names. If methods are important for understanding:
        *   If concise (1-2 methods), you MAY list key method names as part of the class node's **single-line label**, separated by commas or semicolons (e.g., \`MyClass_id["MyClass: methodA(), methodB()"]\`). **NEVER use newlines within the label.**
        *   Alternatively, and preferably for multiple methods or more detail, represent key methods as separate nodes linked to the class node.
    *   **Functions/Methods:** Represent as nodes within their file's subgraph. Show their names. If concise and crucial, include key parameters and a return type in the **single-line label** (e.g., \`calculateTotal_id["calculateTotal(items: Array, discount?: number): number"]\`).
    *   **Objects:** Represent significant object instantiations or definitions as nodes if they are central to the structure. Use **single-line labels**.
    *   **Variables/Constants:** Depict important module-level or class-level variables/constants as nodes if they play a key role in the structure or logic. Use **single-line labels**.

3.  **Relationships:** Clearly show relationships between these elements (both within the same file and across different files), such as:
    *   Function/method calls.
    *   Class inheritance or implementation.
    *   Instantiation of classes.
    *   Import/export dependencies between files/modules (link file subgraphs or nodes within them using their simple alphanumeric IDs).

Guidelines for the diagram:
-   **Clarity and Interactivity:** The primary goal is to create a diagram where clicking on a file's subgraph label (the file path) will be used by the application to show that file's content. Therefore, accurate file path labeling for subgraphs is paramount.
-   **Mermaid Syntax and Node Naming - VERY IMPORTANT:**
    *   **Node IDs (for classes, functions, variables, etc.):** Use a simple, unique, **alphanumeric ID** (e.g., \`classA\`, \`funcB_in_classA\`, \`varX\`). These IDs **MUST NOT** contain spaces, slashes, colons, parentheses, brackets, or any other special characters. Use underscores if needed.
    *   **Node Labels (Display Text for classes, functions, etc.):** The descriptive text for a node (e.g., a function signature like \`MyClass.getUser(id: string): User\`) **MUST** be provided as the label part, enclosed in double quotes. Example of defining such a node: \`funcA_id["doSomething(param1: string): void"]\`.
    *   **Subgraph Definition:** For files, strictly follow the pattern: \`subgraph unique_file_id ["path/to/your/file.ext"]\`. The \`unique_file_id\` must be simple (letters, numbers, underscores), unique, and adhere to the Node ID rules. The "path/to/your/file.ext" is the display label, in quotes, and **single-line**.
    *   **CRITICAL: All node labels and subgraph labels MUST be single-line.** Do NOT include raw newline characters (e.g., '\\n') or attempt to create multi-line labels by embedding extensive file content, '---' separators, bullet points (like '- item'), or code snippets directly within a node's or subgraph's quoted label. If you need to list multiple items like methods or properties within a label, they must be part of the single line, separated by commas or semicolons, or represented as distinct linked nodes.
    *   Use labels for concise identification, not for embedding large blocks of text or file contents.
    *   Ensure all connections (\`-->\`, \`---\`, etc.) are correctly formatted between the simple alphanumeric IDs (of nodes or subgraphs).

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

