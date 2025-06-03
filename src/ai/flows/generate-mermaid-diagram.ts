'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating Mermaid diagrams from code.
 *
 * - generateMermaidDiagram - A function that takes code as input and returns a Mermaid diagram.
 * - GenerateMermaidDiagramInput - The input type for the generateMermaidDiagram function.
 * - GenerateMermaidDiagramOutput - The return type for the generateMermaidDiagram function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMermaidDiagramInputSchema = z.object({
  code: z
    .string()
    .describe('The code to visualize as a Mermaid diagram.'),
});
export type GenerateMermaidDiagramInput = z.infer<typeof GenerateMermaidDiagramInputSchema>;

const GenerateMermaidDiagramOutputSchema = z.object({
  mermaidDiagram: z.string().describe('The Mermaid diagram representing the code structure.'),
});
export type GenerateMermaidDiagramOutput = z.infer<typeof GenerateMermaidDiagramOutputSchema>;

export async function generateMermaidDiagram(input: GenerateMermaidDiagramInput): Promise<GenerateMermaidDiagramOutput> {
  return generateMermaidDiagramFlow(input);
}

const visualizeCodeElementsTool = ai.defineTool({
  name: 'visualizeCodeElements',
  description: 'Decide which code elements and relationships should be visualized in the Mermaid diagram.',
  inputSchema: z.object({
    code: z.string().describe('The code to analyze for visualization.'),
  }),
  outputSchema: z.string().describe('A description of which elements and relationships to visualize in the Mermaid diagram.'),
}, async (input) => {
  // Placeholder implementation - replace with actual logic
  return `Visualize classes, interfaces, and their relationships in the code. ${input.code}`;
});

const generateMermaidDiagramPrompt = ai.definePrompt({
  name: 'generateMermaidDiagramPrompt',
  tools: [visualizeCodeElementsTool],
  input: {schema: GenerateMermaidDiagramInputSchema},
  output: {schema: GenerateMermaidDiagramOutputSchema},
  prompt: `You are an expert at creating Mermaid diagrams to visualize code structure.

  Based on the code provided, and using the visualizeCodeElements tool to decide what to visualize, generate a Mermaid diagram that represents the code's structure and relationships.

  Code: {{{code}}}
  
  The diagram should be clear and easy to understand.
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
    const {output} = await generateMermaidDiagramPrompt(input);
    return output!;
  }
);
