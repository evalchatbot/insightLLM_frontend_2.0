"use client";
import React from "react";
import ReactMarkdown from "react-markdown";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";

interface MarkdownRendererProps {
  source?: string | null;
  partial?: boolean; // whether to apply streaming heuristics
  className?: string;
}

// Simple heuristic to make partial markdown render more nicely while streaming:
// - If there is an unmatched code fence (```), append a closing fence.
// - If the last non-empty line looks like a list item, append an extra newline so lists render.
function tidyPartialMarkdown(text: string) {
  if (!text) return "";
  let out = text;
  const fences = (out.match(/```/g) || []).length;
  if (fences % 2 === 1) {
    out = out + "\n```";
  }
  const lines = out.replace(/\s+$/g, "").split(/\r?\n/);
  const last = lines[lines.length - 1] || "";
  if (/^\s*([-*+]\s+|\d+\.\s+)/.test(last)) {
    out = out + "\n\n";
  }
  return out;
}

const allowedElements = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "em",
  "strong",
  "a",
  "ul",
  "ol",
  "li",
  "code",
  "pre",
  "blockquote",
  "hr",
  "br",
  "inlineCode",
];

function CodeComponent({ node, inline, className, children, ...props }: any) {
  const code = String(children).replace(/\n$/, "");
  if (inline) {
    return <code className="rounded px-1 py-[.05rem] bg-muted/30">{children}</code>;
  }

  // try to detect language from className like language-js
  const match = /language-(\w+)/.exec(className || "");
  try {
    if (match) {
      const highlighted = hljs.highlight(code, { language: match[1] }).value;
      return (
        <pre className="rounded-md overflow-auto bg-[#0b1220] p-3 mb-2">
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      );
    }
  } catch (e) {
    // fallback to auto
  }

  const auto = hljs.highlightAuto(code).value;
  return (
    <pre className="rounded-md overflow-auto bg-[#0b1220] p-3 mb-2">
      <code dangerouslySetInnerHTML={{ __html: auto }} />
    </pre>
  );
}

export default function MarkdownRenderer({ source, partial = false, className }: MarkdownRendererProps) {
  const content = partial ? tidyPartialMarkdown(source || "") : (source || "");

  return (
    <div className={className}>
      <ReactMarkdown
        // do not allow arbitrary HTML (no rehype-raw)
        // restrict to a small set of safe elements
        allowedElements={allowedElements as any}
        components={{
          code: CodeComponent,
          a: ({ href, children }) => (
            // open external links in new tab safely
            <a href={href} target={href && href.startsWith("http") ? "_blank" : undefined} rel={href && href.startsWith("http") ? "noopener noreferrer" : undefined} className="underline text-[#8ab4ff]">
              {children}
            </a>
          ),
          p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
          blockquote: ({ children }) => <blockquote className="pl-3 border-l-2 border-muted/40 italic text-sm">{children}</blockquote>,
          ul: ({ children }) => <ul className="list-disc pl-6 mb-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-2">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          h1: ({ children }) => <h1 className="text-xl font-semibold mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-semibold mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold mb-2">{children}</h3>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
