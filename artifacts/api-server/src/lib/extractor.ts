import { groq, VISION_MODEL, WHISPER_MODEL } from "./groq-client.js";

export interface ExtractedContent {
  filename: string;
  fileType: "image" | "pdf" | "audio" | "text";
  text: string;
  confidence: number | null;
  duration: number | null;
}

export async function extractFromImage(
  buffer: Buffer,
  filename: string,
  mimetype: string
): Promise<ExtractedContent> {
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimetype};base64,${base64}`;

  const resp = await groq.chat.completions.create({
    model: VISION_MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: dataUrl },
          },
          {
            type: "text",
            text: `Extract ALL text visible in this image. Return only the raw extracted text, preserving structure where possible. If there is no text, describe the image content briefly.`,
          },
        ],
      },
    ],
    max_tokens: 2048,
    temperature: 0,
  });

  const text = resp.choices[0]?.message?.content ?? "";
  return {
    filename,
    fileType: "image",
    text,
    confidence: 0.92,
    duration: null,
  };
}

export async function extractFromPdf(
  buffer: Buffer,
  filename: string
): Promise<ExtractedContent> {
  try {
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js" as string)).default;
    const data = await pdfParse(buffer);
    return {
      filename,
      fileType: "pdf",
      text: data.text.trim(),
      confidence: 0.99,
      duration: null,
    };
  } catch {
    return {
      filename,
      fileType: "pdf",
      text: "Failed to extract PDF text. The file may be scanned or encrypted.",
      confidence: null,
      duration: null,
    };
  }
}

export async function extractFromAudio(
  buffer: Buffer,
  filename: string,
  mimetype: string
): Promise<ExtractedContent> {
  const file = new File([buffer], filename, { type: mimetype });

  const transcription = await groq.audio.transcriptions.create({
    file,
    model: WHISPER_MODEL,
    response_format: "verbose_json",
  });

  const text = (transcription as { text: string }).text ?? "";
  const duration = (transcription as { duration?: number }).duration ?? null;

  return {
    filename,
    fileType: "audio",
    text,
    confidence: 0.95,
    duration,
  };
}

export function extractFromText(content: string, filename: string): ExtractedContent {
  return {
    filename,
    fileType: "text",
    text: content,
    confidence: 1.0,
    duration: null,
  };
}

export async function extractFile(
  buffer: Buffer,
  filename: string,
  mimetype: string
): Promise<ExtractedContent> {
  const lower = mimetype.toLowerCase();

  if (lower.startsWith("image/")) {
    return extractFromImage(buffer, filename, mimetype);
  }

  if (lower === "application/pdf") {
    return extractFromPdf(buffer, filename);
  }

  if (
    lower.startsWith("audio/") ||
    lower === "video/mp4" ||
    filename.match(/\.(mp3|wav|m4a|ogg|webm|flac)$/i)
  ) {
    return extractFromAudio(buffer, filename, mimetype);
  }

  if (lower.startsWith("text/")) {
    return extractFromText(buffer.toString("utf-8"), filename);
  }

  return {
    filename,
    fileType: "text",
    text: "Unsupported file type.",
    confidence: null,
    duration: null,
  };
}
