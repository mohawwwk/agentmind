import { groq, LLM_MODEL, TOKEN_COST_PER_MILLION } from "./groq-client.js";
import {
  summarize,
  analyzeSentiment,
  explainCode,
  fetchYoutubeTranscript,
  answerQuestion,
  compareDocuments,
  getAndResetTokens,
} from "./tools.js";
import type { ExtractedContent } from "./extractor.js";

export interface PlanStep {
  step: number;
  tool: string;
  description: string;
  status: "pending" | "running" | "done" | "error";
  output: string | null;
}

export interface AgentResult {
  plan: PlanStep[];
  answer: string;
  needsClarification: boolean;
  followUpQuestion: string | null;
  tokenCount: number | null;
  estimatedCostUsd: number | null;
}

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "summarize",
      description: "Summarize text into 1-line summary, 3 key bullets, and 5-sentence summary",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "The text content to summarize" },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "analyze_sentiment",
      description: "Perform sentiment analysis: label (positive/negative/neutral/mixed), confidence, and one-line justification",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "Text to analyze for sentiment" },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "explain_code",
      description: "Explain code, detect bugs, determine language, and analyze time/space complexity",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "The code snippet to analyze" },
        },
        required: ["code"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "fetch_youtube_transcript",
      description: "Fetch the transcript of a YouTube video given its URL",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The YouTube video URL" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "answer_question",
      description: "Answer a factual or conversational question using the provided context",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "The question to answer" },
          context: { type: "string", description: "Context text to use for answering" },
        },
        required: ["question", "context"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "compare_documents",
      description: "Compare two pieces of content and answer a question about their relationship or differences",
      parameters: {
        type: "object",
        properties: {
          content1: { type: "string", description: "First document/content" },
          content2: { type: "string", description: "Second document/content" },
          question: { type: "string", description: "Question about how they relate or differ" },
        },
        required: ["content1", "content2", "question"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "ask_clarification",
      description: "Ask the user a clarifying question when the intent is ambiguous or insufficient information is provided",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "A short, clear follow-up question for the user" },
        },
        required: ["question"],
      },
    },
  },
];

function buildContext(message: string, extracted: ExtractedContent[]): string {
  const parts: string[] = [];

  if (message) {
    parts.push(`USER QUERY: ${message}`);
  }

  for (const item of extracted) {
    if (item.text && item.text.trim()) {
      const label =
        item.fileType === "image"
          ? `[IMAGE: ${item.filename}]`
          : item.fileType === "pdf"
          ? `[PDF: ${item.filename}]`
          : item.fileType === "audio"
          ? `[AUDIO TRANSCRIPT: ${item.filename}]`
          : `[FILE: ${item.filename}]`;
      parts.push(`${label}\n${item.text.slice(0, 4000)}`);
    }
  }

  return parts.join("\n\n---\n\n");
}

function extractYoutubeUrls(text: string): string[] {
  const pattern =
    /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[a-zA-Z0-9_-]{11}[^\s]*/g;
  return [...new Set(text.match(pattern) ?? [])];
}

async function executeToolCall(
  toolName: string,
  args: Record<string, string>,
  context: string,
  extracted: ExtractedContent[]
): Promise<string> {
  switch (toolName) {
    case "summarize": {
      const result = await summarize(args.content || context);
      return `**Summary**\n\n**One-line:** ${result.oneLine}\n\n**Key Points:**\n${result.bullets.map((b) => `• ${b}`).join("\n")}\n\n**Detailed Summary:**\n${result.paragraphs.map((p, i) => `${i + 1}. ${p}`).join("\n")}`;
    }
    case "analyze_sentiment": {
      const result = await analyzeSentiment(args.content || context);
      const pct = Math.round(result.confidence * 100);
      return `**Sentiment Analysis**\n\n**Label:** ${result.label.toUpperCase()}\n**Confidence:** ${pct}%\n**Justification:** ${result.justification}`;
    }
    case "explain_code": {
      const result = await explainCode(args.code || context);
      const bugList =
        result.bugs.length > 0
          ? result.bugs.map((b) => `⚠️ ${b}`).join("\n")
          : "✅ No bugs detected";
      return `**Code Explanation**\n\n**Language:** ${result.language}\n\n**What it does:**\n${result.explanation}\n\n**Bugs / Issues:**\n${bugList}\n\n**Time Complexity:** ${result.timeComplexity}\n**Space Complexity:** ${result.spaceComplexity}`;
    }
    case "fetch_youtube_transcript": {
      const result = await fetchYoutubeTranscript(args.url);
      if (result.fallback) {
        return `**YouTube Transcript**\n\n⚠️ ${result.fallback}`;
      }
      const preview = result.transcript.slice(0, 300);
      return `**YouTube Transcript** (Video ID: ${result.videoId})\n\nTranscript fetched (${result.transcript.split(" ").length} words).\n\nPreview: "${preview}…"\n\nFull transcript stored for further processing.`;
    }
    case "answer_question": {
      const answer = await answerQuestion(
        args.question || context,
        args.context || extracted.map((e) => e.text).join("\n\n")
      );
      return answer;
    }
    case "compare_documents": {
      const texts = extracted.map((e) => e.text).filter(Boolean);
      const answer = await compareDocuments(
        args.content1 || texts[0] || "",
        args.content2 || texts[1] || "",
        args.question || context
      );
      return answer;
    }
    default:
      return `Unknown tool: ${toolName}`;
  }
}

export async function runAgent(
  message: string,
  extracted: ExtractedContent[]
): Promise<AgentResult> {
  const plan: PlanStep[] = [];
  let totalTokens = 0;

  // Reset any accumulated tokens from previous requests in tools module
  getAndResetTokens();

  const context = buildContext(message, extracted);

  // Step 1: Auto-detect YouTube URLs in any input and add as pre-step
  const allText = [message, ...extracted.map((e) => e.text)].join(" ");
  const ytUrls = extractYoutubeUrls(allText);

  const preloadedTranscripts: Record<string, string> = {};
  if (ytUrls.length > 0 && message.toLowerCase().match(/summary|summarize|transcript|video|youtube/)) {
    for (const url of ytUrls.slice(0, 2)) {
      plan.push({
        step: plan.length + 1,
        tool: "fetch_youtube_transcript",
        description: `Fetching YouTube transcript from ${url}`,
        status: "running",
        output: null,
      });
      try {
        const result = await fetchYoutubeTranscript(url);
        const output = result.fallback ?? result.transcript.slice(0, 500);
        plan[plan.length - 1].status = "done";
        plan[plan.length - 1].output = output;
        if (!result.fallback) {
          preloadedTranscripts[url] = result.transcript;
        }
      } catch {
        plan[plan.length - 1].status = "error";
        plan[plan.length - 1].output = "Failed to fetch transcript";
      }
    }
  }

  // Enrich context with fetched transcripts
  let enrichedContext = context;
  for (const [url, transcript] of Object.entries(preloadedTranscripts)) {
    enrichedContext += `\n\n---\n[YOUTUBE TRANSCRIPT: ${url}]\n${transcript.slice(0, 4000)}`;
  }

  // Step 2: Call LLM to determine intent and plan tools
  const systemPrompt = `You are an autonomous AI agent. You have access to tools for: summarizing, sentiment analysis, code explanation, YouTube transcript fetching, question answering, and document comparison.

When given user input (which may include text, images, PDFs, or audio transcripts):
1. If the intent is CLEAR: use the most appropriate tool(s) to complete the task.
2. If the intent is AMBIGUOUS or UNCLEAR: use ask_clarification with one short question.
3. For YouTube URLs + summarization request: chain fetch_youtube_transcript then summarize.
4. For multi-file comparison: use compare_documents.
5. For code images/text: use explain_code.
6. NEVER ask for clarification if the task is obvious.

Always use EXACTLY the right tool(s) — no more, no less.`;

  plan.push({
    step: plan.length + 1,
    tool: "intent_detection",
    description: "Analyzing query and determining task type",
    status: "running",
    output: null,
  });

  const intentStep = plan[plan.length - 1];

  const messages: Parameters<typeof groq.chat.completions.create>[0]["messages"] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: enrichedContext },
  ];

  const intentResp = await groq.chat.completions.create({
    model: LLM_MODEL,
    messages,
    tools: TOOLS,
    tool_choice: "required",
    temperature: 0.1,
    max_tokens: 1024,
  });

  totalTokens += intentResp.usage?.total_tokens ?? 0;
  const toolCalls = intentResp.choices[0]?.message?.tool_calls ?? [];

  if (toolCalls.length === 0) {
    intentStep.status = "done";
    intentStep.output = "No tool needed";
    return {
      plan,
      answer: intentResp.choices[0]?.message?.content ?? "I couldn't process your request.",
      needsClarification: false,
      followUpQuestion: null,
      tokenCount: totalTokens,
      estimatedCostUsd:
        (totalTokens / 1_000_000) *
        ((TOKEN_COST_PER_MILLION.input + TOKEN_COST_PER_MILLION.output) / 2),
    };
  }

  // Check if first tool is clarification
  const firstTool = toolCalls[0];
  if (firstTool.function.name === "ask_clarification") {
    const args = JSON.parse(firstTool.function.arguments ?? "{}") as { question: string };
    intentStep.status = "done";
    intentStep.output = `Needs clarification: ${args.question}`;
    return {
      plan,
      answer: "",
      needsClarification: true,
      followUpQuestion: args.question,
      tokenCount: totalTokens,
      estimatedCostUsd:
        (totalTokens / 1_000_000) *
        ((TOKEN_COST_PER_MILLION.input + TOKEN_COST_PER_MILLION.output) / 2),
    };
  }

  intentStep.status = "done";
  intentStep.output = `Selected tools: ${toolCalls.map((t) => t.function.name).join(", ")}`;

  // Step 3: Execute all planned tools
  const toolResults: { name: string; result: string }[] = [];

  for (const tc of toolCalls) {
    const args = JSON.parse(tc.function.arguments ?? "{}") as Record<string, string>;
    const toolStep: PlanStep = {
      step: plan.length + 1,
      tool: tc.function.name,
      description: getToolDescription(tc.function.name, args),
      status: "running",
      output: null,
    };
    plan.push(toolStep);

    try {
      // Handle YouTube chain: if we already have the transcript, use summarize on it
      let toolName = tc.function.name;
      let toolArgs = { ...args };
      if (toolName === "fetch_youtube_transcript") {
        const url = args.url;
        if (preloadedTranscripts[url]) {
          toolStep.output = "Transcript already fetched";
          toolStep.status = "done";
          toolResults.push({ name: toolName, result: preloadedTranscripts[url] });
          continue;
        }
      }

      const result = await executeToolCall(toolName, toolArgs, enrichedContext, extracted);
      toolStep.status = "done";
      toolStep.output = result.slice(0, 200);
      toolResults.push({ name: tc.function.name, result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toolStep.status = "error";
      toolStep.output = `Error: ${msg}`;
      toolResults.push({ name: tc.function.name, result: `Error: ${msg}` });
    }
  }

  // Collect tokens from tool calls (tools.ts accumulates them in totalTokensUsed)
  totalTokens += getAndResetTokens();

  // Step 4: Handle chained summarization after YouTube transcript
  let finalAnswer: string;
  if (
    toolResults.some((r) => r.name === "fetch_youtube_transcript") &&
    toolResults.find((r) => r.name === "fetch_youtube_transcript")?.result &&
    !toolResults.find((r) => r.name === "fetch_youtube_transcript")?.result.includes("⚠️")
  ) {
    const ytResult = toolResults.find((r) => r.name === "fetch_youtube_transcript")!;
    const alreadySummarized = toolResults.some((r) => r.name === "summarize");

    if (!alreadySummarized && message.toLowerCase().match(/summary|summarize/)) {
      const sumStep: PlanStep = {
        step: plan.length + 1,
        tool: "summarize",
        description: "Summarizing fetched YouTube transcript",
        status: "running",
        output: null,
      };
      plan.push(sumStep);

      try {
        const sumResult = await executeToolCall(
          "summarize",
          { content: ytResult.result },
          enrichedContext,
          extracted
        );
        sumStep.status = "done";
        sumStep.output = sumResult.slice(0, 200);
        toolResults.push({ name: "summarize", result: sumResult });
      } catch {
        sumStep.status = "error";
        sumStep.output = "Summarization failed";
      }
    }
  }

  finalAnswer = toolResults
    .filter((r) => r.name !== "fetch_youtube_transcript" || r.result.startsWith("**YouTube"))
    .map((r) => r.result)
    .join("\n\n---\n\n");

  if (!finalAnswer) {
    finalAnswer = "The task was completed but produced no output.";
  }

  const innerTokens = getAndResetTokens();
  totalTokens += innerTokens;

  return {
    plan,
    answer: finalAnswer,
    needsClarification: false,
    followUpQuestion: null,
    tokenCount: totalTokens,
    estimatedCostUsd:
      totalTokens > 0
        ? (totalTokens / 1_000_000) *
          ((TOKEN_COST_PER_MILLION.input + TOKEN_COST_PER_MILLION.output) / 2)
        : null,
  };
}

function getToolDescription(name: string, args: Record<string, string>): string {
  switch (name) {
    case "summarize":
      return "Generating 1-line summary, 3 bullet points, and 5-sentence summary";
    case "analyze_sentiment":
      return "Performing sentiment analysis with confidence score";
    case "explain_code":
      return "Explaining code, detecting bugs, analyzing complexity";
    case "fetch_youtube_transcript":
      return `Fetching YouTube transcript for: ${(args.url ?? "").slice(0, 60)}`;
    case "answer_question":
      return `Answering: "${(args.question ?? "").slice(0, 80)}"`;
    case "compare_documents":
      return "Performing cross-document comparative analysis";
    case "ask_clarification":
      return "Requesting clarification from user";
    default:
      return `Executing ${name}`;
  }
}
