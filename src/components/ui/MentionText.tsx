import React, { Fragment } from 'react';
import { cn } from '@/lib/utils';

interface MentionTextProps {
  text: string;
  onMentionClick?: (username: string) => void;
  className?: string;
}

/**
 * Renders text with clickable @username mentions.
 * Mentions are styled differently and trigger onMentionClick when clicked.
 */
export function MentionText({ text, onMentionClick, className }: MentionTextProps) {
  // Regex to find @username patterns
  const mentionRegex = /@([a-zA-Z0-9_]{1,32})/g;
  
  const parts: Array<{ type: 'text' | 'mention'; content: string; username?: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    // Add the mention
    parts.push({ type: 'mention', content: match[0], username: match[1] });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  // If no mentions found, return plain text
  if (parts.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'mention') {
          return (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                if (onMentionClick && part.username) {
                  onMentionClick(part.username);
                }
              }}
              className={cn(
                'text-primary hover:underline font-medium cursor-pointer',
                'inline'
              )}
            >
              {part.content}
            </button>
          );
        }
        return <Fragment key={index}>{part.content}</Fragment>;
      })}
    </span>
  );
}
