"use client";

import ReactMarkdown from "react-markdown";

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="markdown-content text-sm leading-relaxed">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-black/5 px-1 py-0.5 rounded text-[13px]" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <pre className="bg-[#1d1d1f] text-white p-3 rounded-xl my-2 overflow-x-auto text-[13px] leading-relaxed">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          ul: ({ children }) => <ul className="list-disc pl-5 my-1 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 my-1 space-y-0.5">{children}</ol>,
          a: ({ href, children }) => (
            <a href={href} className="text-[#007aff] underline" target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full text-[13px] border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-[#e8e8ed] px-2 py-1 bg-[#f2f3f5] font-semibold">{children}</th>,
          td: ({ children }) => <td className="border border-[#e8e8ed] px-2 py-1">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
