import { useState, useRef, useEffect } from "react";
import { Terminal, RefreshCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgentChatMutation } from "@/hooks/use-agent-chat";
import { ChatMessageBubble, ChatMessage } from "@/components/ChatMessageBubble";
import { ChatInput } from "@/components/ChatInput";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const mutation = useAgentChatMutation();

  const conversationId = messages.find(m => m.role === "agent")?.id || undefined; // just using the agent's first message id as a proxy, or ideally store it in state

  const handleSend = () => {
    if (!inputMessage.trim() && files.length === 0) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputMessage.trim(),
      files: [...files],
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    
    mutation.mutate(
      {
        message: inputMessage.trim(),
        files: [...files],
        // If we wanted to track actual conversationId from API, we would store it
      },
      {
        onSuccess: (data) => {
          const isFollowUp = data.needsClarification;
          const content = isFollowUp && data.followUpQuestion ? data.followUpQuestion : data.answer;

          const agentMessage: ChatMessage = {
            id: data.conversationId,
            role: "agent",
            content: content,
            extracted: data.extracted,
            plan: data.plan,
            tokenCount: data.tokenCount,
            estimatedCostUsd: data.estimatedCostUsd,
            isFollowUp,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, agentMessage]);
        },
        onError: (err) => {
          const errorMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "agent",
            content: `**Error processing request:**\n${err.message}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      }
    );

    setInputMessage("");
    setFiles([]);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, mutation.isPending]);

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground font-mono">
      {/* Header */}
      <header className="h-14 shrink-0 border-b border-border bg-card flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-primary" />
          <h1 className="font-bold text-sm tracking-widest uppercase">AgentMind <span className="text-primary opacity-80">v1.0</span></h1>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs h-8 px-3 border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
          onClick={() => setMessages([])}
          disabled={messages.length === 0}
        >
          <RefreshCcw className="w-3.5 h-3.5 mr-2" />
          CLEAR BUFFER
        </Button>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6" ref={scrollRef}>
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center mt-20 text-center space-y-6">
              <div className="w-16 h-16 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                <Terminal className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">System Ready.</h2>
              <p className="max-w-md text-muted-foreground text-sm leading-relaxed">
                AgentMind is a multi-modal analysis engine. Attach PDFs, images, or audio files, and I will extract the context and trace my reasoning to provide precise answers.
              </p>
              <div className="flex gap-4 mt-8 opacity-60 text-xs">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span> Vision</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span> Document</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span> Audio</div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessageBubble key={msg.id} message={msg} />
            ))
          )}

          {/* Loading State */}
          {mutation.isPending && (
            <div className="flex w-full justify-start animate-in fade-in duration-300">
              <div className="flex max-w-[85%] md:max-w-[75%] flex-row">
                <div className="shrink-0 mt-1 mr-4">
                  <div className="w-8 h-8 rounded border bg-primary/10 border-primary text-primary flex items-center justify-center">
                    <Terminal className="w-4 h-4" />
                  </div>
                </div>
                <div className="p-4 rounded-lg border bg-card border-border shadow-sm flex items-center gap-3 min-w-[200px]">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-sm font-mono text-muted-foreground animate-pulse">Processing input stream...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="shrink-0 p-4 border-t border-border bg-background">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            message={inputMessage}
            onChange={setInputMessage}
            files={files}
            onAddFiles={(newFiles) => setFiles((prev) => [...prev, ...Array.from(newFiles)])}
            onRemoveFile={(idx) => setFiles((prev) => prev.filter((_, i) => i !== idx))}
            onSend={handleSend}
            disabled={mutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}
