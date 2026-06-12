import { useState } from "react";
import { ChevronRight, Activity, CheckCircle2, CircleDashed, AlertCircle } from "lucide-react";
import { PlanStep } from "@/hooks/use-agent-chat";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export function PlanTracePanel({ plan }: { plan: PlanStep[] }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!plan || plan.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border border-border rounded-md bg-secondary/30 mt-4 overflow-hidden">
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 text-xs font-mono hover:bg-secondary/50 transition-colors">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="w-3.5 h-3.5 text-primary" />
          <span className="uppercase tracking-wider">Execution Trace ({plan.length})</span>
        </div>
        <ChevronRight className={cn("w-3.5 h-3.5 transition-transform text-muted-foreground", isOpen && "rotate-90")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-3 space-y-4 border-t border-border bg-background/30 text-xs">
          {plan.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="mt-0.5 shrink-0">
                {step.status === "done" && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                {step.status === "running" && <Activity className="w-3.5 h-3.5 text-blue-400 animate-pulse" />}
                {step.status === "pending" && <CircleDashed className="w-3.5 h-3.5 text-muted-foreground" />}
                {step.status === "error" && <AlertCircle className="w-3.5 h-3.5 text-destructive" />}
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-mono font-bold text-foreground">[{step.tool}]</span>
                  <span className="text-muted-foreground">{step.description}</span>
                </div>
                {step.output && (
                  <div className="bg-background border border-border p-2.5 rounded text-muted-foreground whitespace-pre-wrap font-mono text-[11px] overflow-x-auto">
                    {step.output}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
