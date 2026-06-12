import { Terminal, User } from "lucide-react";
import { MarkdownText } from "./MarkdownText";
import { FileChip } from "./FileChip";
import { PlanTracePanel } from "./PlanTracePanel";
import { ExtractedContentPanel } from "./ExtractedContentPanel";
import { ExtractedContent, PlanStep } from "@/hooks/use-agent-chat";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  files?: File[];
  extracted?: ExtractedContent[];
  plan?: PlanStep[];
  tokenCount?: number | null;
  estimatedCostUsd?: number | null;
  isFollowUp?: boolean;
  timestamp: Date;
}

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isAgent = message.role === "agent";

  return (
    <div className={cn("flex w-full", isAgent ? "justify-start" : "justify-end")}>
      <div className={cn(
        "flex max-w-[85%] md:max-w-[75%]",
        isAgent ? "flex-row" : "flex-row-reverse"
      )}>
        {/* Avatar */}
        <div className={cn("shrink-0 mt-1", isAgent ? "mr-4" : "ml-4")}>
          <div className={cn(
            "w-8 h-8 rounded border flex items-center justify-center",
            isAgent ? "bg-primary/10 border-primary text-primary" : "bg-secondary border-border text-muted-foreground"
          )}>
            {isAgent ? <Terminal className="w-4 h-4" /> : <User className="w-4 h-4" />}
          </div>
        </div>

        {/* Content Box */}
        <div className="min-w-0">
          <div className={cn(
            "p-4 rounded-lg border",
            isAgent 
              ? "bg-card border-border shadow-sm" 
              : "bg-secondary border-border"
          )}>
            {/* User Files */}
            {message.files && message.files.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {message.files.map((f, i) => (
                  <FileChip key={i} name={f.name} type={f.type} />
                ))}
              </div>
            )}

            {/* Text Content */}
            <div className="text-sm">
              {isAgent ? (
                <MarkdownText content={message.content} />
              ) : (
                <div className="whitespace-pre-wrap break-words">{message.content}</div>
              )}
            </div>

            {/* Agent specific sub-panels */}
            {isAgent && (
              <>
                {message.extracted && message.extracted.length > 0 && (
                  <ExtractedContentPanel extracted={message.extracted} />
                )}
                {message.plan && message.plan.length > 0 && (
                  <PlanTracePanel plan={message.plan} />
                )}
              </>
            )}
          </div>

          {/* Metadata Footer */}
          {isAgent && (message.tokenCount || message.estimatedCostUsd) && (
            <div className="flex items-center gap-3 mt-2 px-1 text-[10px] font-mono text-muted-foreground">
              {message.tokenCount && <span>TOKENS: {message.tokenCount}</span>}
              {message.estimatedCostUsd && <span>COST: ${message.estimatedCostUsd.toFixed(4)}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
