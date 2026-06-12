import { Router, type IRouter } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { extractFile } from "../lib/extractor.js";
import { runAgent } from "../lib/agent.js";
import { AgentChatResponse } from "@workspace/api-zod";

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.post(
  "/agent/chat",
  upload.array("files"),
  async (req, res): Promise<void> => {
    const message = typeof req.body?.message === "string" ? req.body.message : "";
    const files = (req.files ?? []) as Express.Multer.File[];

    if (!message && files.length === 0) {
      res.status(400).json({ error: "Provide at least a message or one file" });
      return;
    }

    try {
      req.log.info({ fileCount: files.length, message: message.slice(0, 80) }, "Agent chat request");

      // Extract content from all files in parallel
      const extractionPromises = files.map((f) =>
        extractFile(f.buffer, f.originalname, f.mimetype)
      );
      const extracted = await Promise.all(extractionPromises);

      req.log.info({ extractedCount: extracted.length }, "Files extracted");

      // Run the agent
      const result = await runAgent(message, extracted);

      const conversationId = randomUUID();

      const response = AgentChatResponse.parse({
        conversationId,
        extracted: extracted.map((e) => ({
          filename: e.filename,
          fileType: e.fileType,
          text: e.text,
          confidence: e.confidence,
          duration: e.duration,
        })),
        plan: result.plan,
        answer: result.answer,
        followUpQuestion: result.followUpQuestion,
        needsClarification: result.needsClarification,
        tokenCount: result.tokenCount,
        estimatedCostUsd: result.estimatedCostUsd,
      });

      res.json(response);
    } catch (err: unknown) {
      req.log.error({ err }, "Agent error");

      // Groq rate limit — surface a helpful message
      if (
        typeof err === "object" &&
        err !== null &&
        "status" in err &&
        (err as { status: number }).status === 429
      ) {
        const raw = (err as { message?: string }).message ?? "";
        const waitMatch = raw.match(/Please try again in ([^.]+)\./);
        const waitMsg = waitMatch ? ` Please wait ${waitMatch[1]} and try again.` : " Please try again shortly.";
        res.status(429).json({
          error: `Groq rate limit reached (100k tokens/day on free tier).${waitMsg} You can upgrade at console.groq.com/settings/billing.`,
        });
        return;
      }

      res.status(500).json({ error: "Agent processing failed. Please try again." });
    }
  }
);

export default router;
