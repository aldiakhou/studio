
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
1.  **File and Folder Structure:** Use subgraphs to represent folders. Show individual files within their respective folders.
2.  **Key Code Elements:** Within or linked to each file, detail important:
    *   **Classes:** Include their names and a list of important methods (e.g., label "MyClass" with methods listed).
    *   **Functions/Methods:** Show their names. If space permits and it's crucial for understanding, include key parameters and a concise return type (e.g., label "calculateTotal(items: Array, discount?: number): number").
    *   **Objects:** Represent significant object instantiations or definitions.
    *   **Variables/Constants:** Depict important module-level or class-level variables/constants if they play a key role in the structure or logic.
3.  **Relationships:** Clearly show relationships between these elements, such as:
    *   Function/method calls between different components.
    *   Class inheritance or implementation.
    *   Instantiation of classes.
    *   Import/export dependencies between files/modules.

Guidelines for the diagram:
-   **Clarity and Readability:** While detail is requested, the diagram must remain understandable. Avoid excessive clutter. Make smart choices about what is "important" to display.
-   **Mermaid Syntax and Node Naming - VERY IMPORTANT:**
    *   **Node IDs:** For each element (file, class, function, etc.), use a simple, unique, **alphanumeric ID** (e.g., \`file1\`, \`classA\`, \`funcB_in_classA\`, \`varX\`). These IDs **MUST NOT** contain spaces, slashes, colons, parentheses, brackets, or any other special characters.
    *   **Node Labels (Display Text):** The descriptive text for a node (e.g., the actual file path like \`src/components/button.tsx\`, or a function signature like \`MyClass.getUser(id: string): User\`) **MUST** be provided as the label part, enclosed in double quotes.
        Example of defining a node: \`file1["src/components/button.tsx"]\`
        Example of defining another node: \`funcA["doSomething(param1: string): void"]\`
        Example of a link: \`file1 --> funcA\`
    *   **CRITICAL: Node labels MUST be single-line.** Do NOT include raw newline characters (e.g., '\\n') or attempt to create multi-line labels by embedding extensive file content, '---' separators, or code snippets directly within a node's quoted label.
    *   **Use labels for concise identification** (like file paths, function names, class names), not for embedding large blocks of text or file contents.
    *   If a descriptive label itself needs to contain double quotes, try to simplify the label to avoid this. If unavoidable, ensure Mermaid's requirements for escaping internal quotes are met (often by using \`&quot;\` or by careful structuring, though simplification is highly preferred).
    *   Ensure all connections (\`-->\`, \`---\`, etc.) are correctly formatted between the simple alphanumeric IDs.
-   **Focus:** The goal is to understand the project's components and how they interact.
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

