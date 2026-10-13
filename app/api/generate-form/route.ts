import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { AiFormSpecSchema } from '../../components/formSpec';
import { ATTACHMENT_TYPES, MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES } from '../../components/attachments';

// Cheapest current model, at low effort, to keep per-form cost to a fraction of a cent.
const MODEL = 'claude-haiku-5-5';
const MAX_OUTPUT_TOKENS = 8000;

// Simple in-memory limiter: protects the API key from runaway use. Resets on server restart.
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
    recent.push(now);
    hits.set(key, recent);
    return recent.length > RATE_LIMIT;
}

const RequestSchema = z.object({
    request: z.string().trim().min(3).max(2000),
    history: z.array(z.string().max(2000)).max(10).default([]),
    currentSpec: AiFormSpecSchema.nullable().default(null),
    attachments: z.array(z.object({
        name: z.string().max(200),
        mediaType: z.enum(ATTACHMENT_TYPES),
        // base64 grows files by ~4/3
        data: z.string().min(1).max(Math.ceil(MAX_ATTACHMENT_BYTES * 1.4)),
    })).max(MAX_ATTACHMENTS).default([]),
});

// PDFs and text go in as documents, images as images; Claude reads all of them directly.
function attachmentBlock(file: z.infer<typeof RequestSchema>['attachments'][number]): Anthropic.ContentBlockParam {
    if (file.mediaType === 'application/pdf') {
        return { type: 'document', title: file.name, source: { type: 'base64', media_type: 'application/pdf', data: file.data } };
    }
    if (file.mediaType === 'text/plain' || file.mediaType === 'text/csv') {
        return { type: 'document', title: file.name, source: { type: 'text', media_type: 'text/plain', data: file.data } };
    }
    return { type: 'image', source: { type: 'base64', media_type: file.mediaType, data: file.data } };
}

const SYSTEM_PROMPT = `You design printable application forms for FormBuilder, a tool used by KredX (an Indian invoice-discounting and trade-finance platform) to create onboarding and KYC forms that are filled by hand or on screen and exported to PDF.

Turn the user's description into a complete, well-organised form:
- Group fields into logical sections in the order a person would fill them (entity details, contact, ownership, bank details, documents, declaration).
- Use Indian conventions where relevant: PAN (10 boxes), GSTIN (15), IFSC (11), PIN code (6), mobile (10), CIN (21), Aadhaar (12).
- Use checkbox fields with options for any either/or or multiple-choice question; never use checkbox without options.
- Finish forms that need consent with a Declaration section containing a date field and a signature field.
- Keep labels short and printable. Only add help text where it removes real ambiguity.
- Do not invent sections the user clearly does not need.
- If files are attached (an existing form, a scan, a checklist or a policy), base the form on them: keep their sections, field order and wording unless the user asks otherwise, and ignore content that is not about the form.
- On the platform, sellers (also called vendors or suppliers) sell to buyers on credit, and financiers fund the invoices. Use "Seller" rather than "Vendor".

When you are given the current form and a change request, apply only the requested change, keep everything else as it was (including section titles and field labels, so the editor can match them), and return the complete updated form. If the request asks for a different form altogether, replace the current form entirely. Write the summary as a short note to the user about what you did.`;

export async function POST(req: Request) {
    if (!process.env.ANTHROPIC_API_KEY) {
        return Response.json(
            { error: 'AI form generation is not set up yet. Add ANTHROPIC_API_KEY to .env.local and restart the server.' },
            { status: 503 }
        );
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    if (rateLimited(ip)) {
        return Response.json({ error: "You've made a lot of requests in a short time. Please wait a few minutes and try again." }, { status: 429 });
    }

    let body: z.infer<typeof RequestSchema>;
    try {
        body = RequestSchema.parse(await req.json());
    } catch {
        return Response.json({ error: 'Please describe the form in 3 to 2,000 characters, and attach at most 3 files of up to 5 MB each.' }, { status: 400 });
    }

    const { request, history, currentSpec, attachments } = body;
    const userContent = currentSpec
        ? [
            'Current form (JSON):',
            JSON.stringify(currentSpec),
            history.length ? `Earlier requests, for context:\n${history.map((h, i) => `${i + 1}. ${h}`).join('\n')}` : '',
            `Change request: ${request}`,
        ].filter(Boolean).join('\n\n')
        : `Create a form from this description:\n\n${request}`;
    const attachmentNote = attachments.length
        ? `\n\nAttached: ${attachments.map((a) => a.name).join(', ')}.`
        : '';

    const client = new Anthropic();

    try {
        const response = await client.messages.parse({
            model: MODEL,
            max_tokens: MAX_OUTPUT_TOKENS,
            system: SYSTEM_PROMPT,
            messages: [{
                role: 'user',
                content: [...attachments.map(attachmentBlock), { type: 'text', text: userContent + attachmentNote }],
            }],
            output_config: {
                effort: 'low',
                format: zodOutputFormat(AiFormSpecSchema),
            },
        });

        if (response.stop_reason === 'refusal') {
            return Response.json({ error: "I can't help create that form. Try describing a different form." }, { status: 422 });
        }
        if (response.stop_reason === 'max_tokens') {
            return Response.json({ error: 'That form is too large to generate in one go. Try describing fewer sections, then add more by refining.' }, { status: 422 });
        }
        if (!response.parsed_output) {
            return Response.json({ error: 'The AI returned an unexpected result. Please try again.' }, { status: 502 });
        }

        return Response.json({ spec: response.parsed_output, usage: response.usage });
    } catch (error) {
        if (error instanceof Anthropic.AuthenticationError) {
            console.error('Anthropic auth error:', error.message);
            return Response.json({ error: 'The AI service rejected the API key. Check ANTHROPIC_API_KEY.' }, { status: 500 });
        }
        if (error instanceof Anthropic.RateLimitError) {
            return Response.json({ error: 'The AI service is busy right now. Please try again in a minute.' }, { status: 429 });
        }
        if (error instanceof Anthropic.APIError) {
            console.error(`Anthropic API error ${error.status}:`, error.message);
            return Response.json({ error: 'The AI service had a problem. Please try again.' }, { status: 502 });
        }
        console.error('Form generation failed:', error);
        return Response.json({ error: "We couldn't reach the AI service. Check your connection and try again." }, { status: 502 });
    }
}
