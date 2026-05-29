import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

const components: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className ?? '');
    const isInline = !match && !className;

    if (isInline) {
      return (
        <code
          className="bg-muted text-foreground px-1 py-0.5 rounded-chip text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }

    const language = match?.[1] ?? 'text';
    return (
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        className="rounded-md my-2 text-sm"
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    );
  },

  a({ href, children, ...props }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline hover:text-primary/80"
        {...props}
      >
        {children}
      </a>
    );
  },

  h1: ({ children }) => <h1 className="text-2xl font-bold mt-4 mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-bold mt-3 mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-semibold mt-3 mb-1">{children}</h3>,

  ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="ml-2">{children}</li>,

  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-border pl-4 my-2 text-muted-foreground italic">
      {children}
    </blockquote>
  ),

  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full border border-border text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-border px-3 py-2 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => <td className="border border-border px-3 py-2">{children}</td>,

  p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,

  hr: () => <hr className="my-4 border-border" />,
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
