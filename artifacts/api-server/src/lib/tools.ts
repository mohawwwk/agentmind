import { groq, LLM_MODEL } from "./groq-client.js";

export interface SummarizeResult {
  oneLine: string;
  bullets: string[];
  paragraphs: string[];
}

export interface SentimentResult {
  label: "positive" | "negative" | "neutral" | "mixed";
  confidence: number;
  justification: string;
}

export interface CodeExplanationResult {
  language: string;
  explanation: string;
  bugs: string[];
  timeComplexity: string;
  spaceComplexity: string;
}

export interface YoutubeTranscriptResult {
  transcript: string;
  videoId: string;
  fallback?: string;
}

let totalTokensUsed = 0;

export function getAndResetTokens(): number {
  const t = totalTokensUsed;
  totalTokensUsed = 0;
  return t;
}

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const resp = await groq.chat.completions.create({
    model: LLM_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 2048,
  });

  totalTokensUsed += resp.usage?.total_tokens ?? 0;
  return resp.choices[0]?.message?.content ?? "";
}

export async function summarize(content: string): Promise<SummarizeResult> {
  const raw = await callLLM(
    `You are a summarization assistant. Always respond with valid JSON only, no markdown.`,
    `Summarize the following content. Return JSON with exactly:
{
  "oneLine": "<one sentence summary>",
  "bullets": ["<point 1>", "<point 2>", "<point 3>"],
  "paragraphs": ["<sentence 1>", "<sentence 2>", "<sentence 3>", "<sentence 4>", "<sentence 5>"]
}

Content:
${content.slice(0, 6000)}`
  );

  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      oneLine: "Unable to summarize content.",
      bullets: ["Content processed", "Summary unavailable", "Please try again"],
      paragraphs: ["The content was received but could not be summarized in the expected format."],
    };
  }
}

export async function analyzeSentiment(content: string): Promise<SentimentResult> {
  const raw = await callLLM(
    `You are a sentiment analysis expert. Always respond with valid JSON only, no markdown.`,
    `Analyze the sentiment of the following text. Return JSON with exactly:
{
  "label": "<positive|negative|neutral|mixed>",
  "confidence": <0.0 to 1.0>,
  "justification": "<one sentence explaining the sentiment>"
}

Text:
${content.slice(0, 4000)}`
  );

  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      label: "neutral",
      confidence: 0.5,
      justification: "Could not determine sentiment from the provided text.",
    };
  }
}

export async function explainCode(code: string): Promise<CodeExplanationResult> {
  const raw = await callLLM(
    `You are a senior software engineer. Always respond with valid JSON only, no markdown fences.`,
    `Analyze the following code snippet. Return JSON with exactly:
{
  "language": "<programming language>",
  "explanation": "<clear explanation of what the code does>",
  "bugs": ["<bug or issue 1>", ...],
  "timeComplexity": "<Big-O time complexity>",
  "spaceComplexity": "<Big-O space complexity>"
}

If no bugs are found, use an empty array for bugs.

Code:
${code.slice(0, 4000)}`
  );

  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      language: "Unknown",
      explanation: "Code analysis failed.",
      bugs: [],
      timeComplexity: "Unknown",
      spaceComplexity: "Unknown",
    };
  }
}

export async function fetchYoutubeTranscript(url: string): Promise<YoutubeTranscriptResult> {
  const videoIdMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  const videoId = videoIdMatch?.[1];

  if (!videoId) {
    return {
      transcript: "",
      videoId: "",
      fallback: "Could not extract a valid YouTube video ID from the URL.",
    };
  }

  try {
    const { YoutubeTranscript } = await import("youtube-transcript");
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    const transcript = segments.map((s) => s.text).join(" ");
    return { transcript, videoId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      transcript: "",
      videoId,
      fallback: `Transcript unavailable for video ${videoId}: ${message}`,
    };
  }
}

export async function answerQuestion(question: string, context: string): Promise<string> {
  return callLLM(
    `You are a helpful, concise assistant. Answer based on the provided context. If the context doesn't contain enough information, say so clearly.`,
    `Context:
${context.slice(0, 5000)}

Question: ${question}`
  );
}

export async function compareDocuments(
  content1: string,
  content2: string,
  question: string
): Promise<string> {
  return callLLM(
    `You are an analytical assistant skilled at comparing documents. Be specific and structured.`,
    `Document 1:
${content1.slice(0, 3000)}

Document 2:
${content2.slice(0, 3000)}

Question: ${question || "Do these documents discuss the same topic? Provide a detailed comparative analysis."}`
  );
}
