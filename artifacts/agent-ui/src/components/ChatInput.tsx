import { useRef, KeyboardEvent } from "react";
import { Paperclip, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileChip } from "./FileChip";

interface ChatInputProps {
  message: string;
  onChange: (val: string) => void;
  files: File[];
  onAddFiles: (files: FileList) => void;
  onRemoveFile: (index: number) => void;
  onSend: () => void;
  disabled?: boolean;
}

export function ChatInput({
  message,
  onChange,
  files,
  onAddFiles,
  onRemoveFile,
  onSend,
  disabled
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && (message.trim() || files.length > 0)) {
        onSend();
      }
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm flex flex-col focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
      {/* File Previews */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 border-b border-border/50 bg-secondary/10 rounded-t-lg">
          {files.map((file, i) => (
            <FileChip
              key={i}
              name={file.name}
              type={file.type}
              onRemove={() => onRemoveFile(i)}
            />
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end p-2 gap-2">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept="image/jpeg,image/png,application/pdf,audio/mpeg,audio/wav,audio/x-m4a"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onAddFiles(e.target.files);
            }
            // Reset to allow selecting the same file again
            e.target.value = "";
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        <Textarea
          value={message}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter a prompt or attach files (text, images, PDFs, audio)..."
          className="min-h-[40px] max-h-[200px] resize-none border-0 focus-visible:ring-0 shadow-none px-2 py-2.5 text-sm bg-transparent"
          disabled={disabled}
          rows={1}
          style={{ height: "auto" }}
          ref={(el) => {
            if (el) {
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
            }
          }}
        />

        <Button
          size="icon"
          onClick={onSend}
          disabled={disabled || (!message.trim() && files.length === 0)}
          className="shrink-0 h-10 w-10 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
