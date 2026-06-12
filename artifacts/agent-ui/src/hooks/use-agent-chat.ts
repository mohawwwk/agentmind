import { useMutation } from "@tanstack/react-query";

export interface ExtractedContent {
  filename: string;
  fileType: "image" | "pdf" | "audio" | "text";
  text: string;
  confidence: number | null;
  duration: number | null;
}

export interface PlanStep {
  step: number;
  tool: string;
  description: string;
  status: "pending" | "running" | "done" | "error";
  output: string | null;
}

export interface ChatResult {
  conversationId: string;
  extracted: ExtractedContent[];
  plan: PlanStep[];
  answer: string;
  followUpQuestion: string | null;
  needsClarification: boolean;
  tokenCount: number | null;
  estimatedCostUsd: number | null;
}

export interface ChatPayload {
  message: string;
  files: File[];
  conversationId?: string;
}

export function useAgentChatMutation() {
  return useMutation({
    mutationFn: async ({ message, files, conversationId }: ChatPayload) => {
      const form = new FormData();
      form.append("message", message);
      if (conversationId) {
        form.append("conversationId", conversationId);
      }
      for (const file of files) {
        form.append("files", file);
      }
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? "Request failed");
      }
      return res.json() as Promise<ChatResult>;
    },
  });
}
