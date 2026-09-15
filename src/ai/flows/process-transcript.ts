
'use server';
/**
 * @fileOverview An AI flow to process and structure raw chat transcripts based on a detailed pipeline.
 *
 * - processTranscript - A function that applies a multi-step cleaning and analysis pipeline to a transcript.
 * - ProcessTranscriptInput - The input type for the function.
 * - ProcessTranscriptOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProcessTranscriptInputSchema = z.object({
  rawTranscript: z.string().describe('The raw, "dirty" transcript text to be processed.'),
  preprocess_toggle: z.boolean().describe('A flag to determine whether to run the full processing pipeline.'),
});
export type ProcessTranscriptInput = z.infer<typeof ProcessTranscriptInputSchema>;


const ProcessTranscriptOutputSchema = z.object({
  cleaned_transcript: z.string().describe('The processed, human-readable transcript.'),
});
export type ProcessTranscriptOutput = z.infer<typeof ProcessTranscriptOutputSchema>;

export async function processTranscript(input: ProcessTranscriptInput): Promise<ProcessTranscriptOutput> {
  return processTranscriptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'processTranscriptPrompt',
  input: {schema: z.object({ transcriptToClean: z.string() })},
  output: {schema: ProcessTranscriptOutputSchema},
  prompt: `You are an expert transcript processing AI. Your task is to convert a messy interview transcript into a cleaned, human-readable transcript. Be faithful to the original meaning, apply light grammar fixes only, and never invent content.

Your output MUST be a JSON object with a single key: "cleaned_transcript".

### Raw Transcript To Clean
The following transcript has had critically important sentences removed. Your job is to clean up only what is left.
\`\`\`
{{{transcriptToClean}}}
\`\`\`

### Processing Instructions
Follow these steps to produce the final JSON object containing the cleaned version of the text provided above.

1) **Normalisation**
- Perform Unicode normalisation; collapse repeated whitespace/newlines.
- Standardise quotes and dashes; capitalise sentence starts when clearly missing.
- Preserve speaker labels and timestamps if present (e.g., Speaker 1, 00:00:10:00 - 00:00:20:00).
- Apply light proper-noun casing only (e.g., vitaminwater → VitaminWater).

2) **Disfluency & filler cleanup (conservative)**
- Remove only clearly non-semantic fillers: uh, umm, simple stutters (w-), doubled words, and trailing discourse markers (you know, I mean).
- Collapse repeated intensifiers (really, really → really).
- Keep hedging/adverbs that carry meaning (“probably”, “sort of”) and do not rewrite facts.

**Final instruction:** You must output a JSON object with a single key: "cleaned_transcript".
`,
});

// Keywords that identify sentences to be protected from AI processing.
const PRESERVE_KEYWORDS = [
    'VitaminWater', 'Gatorade', 'electrolytes', 'sodium', 'potassium', 'Celsius', 'Red Bull'
];

const processTranscriptFlow = ai.defineFlow(
  {
    name: 'processTranscriptFlow',
    inputSchema: ProcessTranscriptInputSchema,
    outputSchema: ProcessTranscriptOutputSchema,
  },
  async ({ rawTranscript, preprocess_toggle }) => {
    if (!preprocess_toggle) {
        // If the toggle is off, just return the raw transcript.
        return { cleaned_transcript: rawTranscript };
    }
    
    if (!rawTranscript || rawTranscript.trim() === "") {
        return { cleaned_transcript: "" };
    }

    // "Protect, then Process" approach
    // 1. Protect: Manually find and isolate sentences with critical keywords.
    const sentences = rawTranscript.split(/(?<=[.?!])\s+/);
    const protectedSentences: string[] = [];
    const sentencesToProcess: string[] = [];

    sentences.forEach(sentence => {
        const hasKeyword = PRESERVE_KEYWORDS.some(keyword => 
            new RegExp(`\\b${keyword}\\b`, 'i').test(sentence)
        );
        if (hasKeyword) {
            protectedSentences.push(sentence);
        } else {
            sentencesToProcess.push(sentence);
        }
    });

    const transcriptToClean = sentencesToProcess.join(' ');
    
    // 2. Process: Send only the "safe" text to the AI for cleaning.
    const {output} = await prompt({transcriptToClean});

    if (!output) {
        throw new Error("The AI model failed to process the transcript. Output was null.");
    }

    // 3. Reassemble: Combine the AI's cleaned output with the protected sentences.
    // This is a simple append. A more sophisticated approach could try to re-insert them
    // based on placeholders, but this guarantees preservation.
    const finalTranscript = [output.cleaned_transcript, ...protectedSentences].join('\n\n');
    
    return {
        cleaned_transcript: finalTranscript
    };
  }
);
