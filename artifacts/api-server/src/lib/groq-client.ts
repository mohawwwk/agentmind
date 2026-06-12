import Groq from "groq-sdk";

if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY environment variable is required");
}

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const LLM_MODEL = "llama-3.3-70b-versatile";
export const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
export const WHISPER_MODEL = "whisper-large-v3";

export const TOKEN_COST_PER_MILLION = {
  input: 0.59,
  output: 0.79,
};
