
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
        if (error instanceof Error) {
             return { error: error.message } as any;
        }
        return { error: "An unknown error occurred during diagram generation" } as any;
    }
}

