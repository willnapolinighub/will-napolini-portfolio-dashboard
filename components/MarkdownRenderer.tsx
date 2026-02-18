'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Highlight, themes } from 'prism-react-renderer';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

const CodeBlock = ({ language, children }: { language?: string; children: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3">
      <div className="flex items-center justify-between bg-gray-800 rounded-t-lg px-4 py-2 text-xs text-gray-400">
        <span>{language || 'code'}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 hover:text-white transition-colors">
          {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
        </button>
      </div>
      <Highlight theme={themes.vsDark} code={children} language={(language || 'text') as any}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={className} style={{ ...style, margin: 0, borderRadius: '0 0 0.5rem 0.5rem', fontSize: '0.875rem', padding: '1rem', overflow: 'auto' }}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, key) => <span key={key} {...getTokenProps({ token })} />)}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
};

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="markdown-content text-sm">
      <ReactMarkdown
        components={{
          code({ className, children }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !className;
            if (isInline) {
              return <code className="bg-gray-700/50 text-accent-green px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>;
            }
            return <CodeBlock language={match?.[1]}>{String(children).replace(/\n$/, '')}</CodeBlock>;
          },
          p({ children }) { return <p className="mb-3 last:mb-0">{children}</p>; },
          h1({ children }) { return <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0">{children}</h1>; },
          h2({ children }) { return <h2 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h2>; },
          h3({ children }) { return <h3 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h3>; },
          ul({ children }) { return <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>; },
          ol({ children }) { return <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>; },
          li({ children }) { return <li className="ml-2">{children}</li>; },
          blockquote({ children }) { return <blockquote className="border-l-4 border-accent-green/50 pl-4 my-3 italic text-gray-300">{children}</blockquote>; },
          a({ href, children }) { return <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent-green hover:underline">{children}</a>; },
          strong({ children }) { return <strong className="font-bold">{children}</strong>; },
          em({ children }) { return <em className="italic">{children}</em>; },
          hr() { return <hr className="border-white/10 my-4" />; },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
