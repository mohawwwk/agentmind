import { useState } from "react";
import { ChevronRight, FileSearch } from "lucide-react";
import { ExtractedContent } from "@/hooks/use-agent-chat";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ExtractedContentPanel({ extracted }: { extracted: ExtractedContent[] }) {
  if (!extracted || extracted.length === 0) return null;

  return (
    <div className="space-y-2 mt-4">
      <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-2 px-1 mb-2">
        <FileSearch className="w-3 h-3 text-primary" />
        Extracted Context
      </div>
      {extracted.map((ext, i) => (
        <ExtractedItem key={i} item={ext} />
      ))}
    </div>
  );
}

function ExtractedItem({ item }: { item: ExtractedContent }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border border-border rounded-md bg-secondary/20 overflow-hidden">
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs hover:bg-secondary/40 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <ChevronRight className={cn("w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
          <span className="font-mono text-muted-foreground truncate">{item.filename}</span>
          <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 h-4 rounded-sm border-primary/30 text-primary font-mono bg-primary/5">
            {item.fileType.toUpperCase()}
          </Badge>
          {item.confidence !== null && (
             <span className="shrink-0 text-muted-foreground text-[10px] font-mono">
               CONF: {(item.confidence * 100).toFixed(0)}%
             </span>
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-3 border-t border-border bg-background/50 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
          {item.text}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
