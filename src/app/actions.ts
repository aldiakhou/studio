// @ts-nocheck
// This is a workaround for a Genkit + Next.js bug.
// TODO: Remove this when fix is released.
// https://github.com/firebase/genkit/issues/1430
"use server";

import { generateMermaidDiagram as genMermaidDiagramFlow, type GenerateMermaidDiagramInput, type GenerateMermaidDiagramOutput } from '@/ai/flows/generate-mermaid-diagram';

export async function generateMermaidDiagramAction(input: GenerateMermaidDiagramInput): Promise<GenerateMermaidDiagramOutput> {
    try {
        const result = await genMermaidDiagramFlow(input);
        return result;
    } catch (error) {
        console.error("Error in generateMermaidDiagramAction:", error);
        // It's good practice to return a structured error or throw a custom error
        // For now, we'll rethrow, but this could be refined
        if (error instanceof Error) {
             return { error: error.message } as any; // Or a more specific error structure
        }
        return { error: "An unknown error occurred" } as any;
    }
}
