import React from 'react';

export function MarkdownText({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('• ') || line.startsWith('- ')) {
          return (
            <div key={i} className="flex gap-2 ml-4">
              <span className="text-primary mt-0.5">•</span>
              <span className="flex-1">{renderBold(line.substring(2))}</span>
            </div>
          );
        }
        if (line.trim() === '') return <div key={i} className="h-2" />;
        return <p key={i}>{renderBold(line)}</p>;
      })}
    </div>
  );
}

function renderBold(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-primary">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}
