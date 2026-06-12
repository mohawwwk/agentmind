import { File, FileText, Image as ImageIcon, Music, X } from "lucide-react";

interface FileChipProps {
  name: string;
  type: string;
  onRemove?: () => void;
}

export function FileChip({ name, type, onRemove }: FileChipProps) {
  let Icon = File;
  if (type.startsWith("image")) Icon = ImageIcon;
  else if (type.startsWith("audio")) Icon = Music;
  else if (type.includes("pdf")) Icon = FileText;

  return (
    <div className="inline-flex items-center gap-2 bg-secondary border border-border px-2.5 py-1.5 rounded-md text-xs font-mono group">
      <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
      <span className="truncate max-w-[150px] text-secondary-foreground" title={name}>{name}</span>
      {onRemove && (
        <button 
          onClick={onRemove} 
          className="text-muted-foreground hover:text-destructive shrink-0 ml-1 opacity-70 group-hover:opacity-100 transition-opacity"
          type="button"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
