/**
 * MarkdownRenderer — hardens LLM output against XSS / injection.
 *
 * Security posture (LLM02 — Insecure Output Handling):
 * - All content is treated as untrusted hostile input.
 * - rehype-sanitize strips raw HTML that react-markdown would otherwise pass.
 * - All links validated through safeLinkHref — blocks javascript:, data:, vbscript:.
 * - External links always noopener noreferrer.
 * - No dangerouslySetInnerHTML anywhere.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism-light";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import oneLight from "react-syntax-highlighter/dist/esm/styles/prism/one-light";
import { Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { safeLinkHref } from "@/lib/safe-url";

interface MarkdownRendererProps {
  content: string;
  fontSize: "small" | "medium" | "large";
}

const fontSizeClasses = {
  small: "text-sm",
  medium: "text-base",
  large: "text-lg",
};

const LANGUAGES = {
  bash,
  css,
  javascript,
  json,
  jsx,
  markdown,
  markup,
  python,
  sql,
  tsx,
  typescript,
};

Object.entries(LANGUAGES).forEach(([name, language]) => {
  SyntaxHighlighter.registerLanguage(name, language);
});
SyntaxHighlighter.registerLanguage("js", javascript);
SyntaxHighlighter.registerLanguage("ts", typescript);
SyntaxHighlighter.registerLanguage("html", markup);
SyntaxHighlighter.registerLanguage("xml", markup);
SyntaxHighlighter.registerLanguage("sh", bash);
SyntaxHighlighter.registerLanguage("shell", bash);
SyntaxHighlighter.registerLanguage("py", python);

const SUPPORTED_LANGUAGES = new Set([
  ...Object.keys(LANGUAGES),
  "js",
  "ts",
  "html",
  "xml",
  "sh",
  "shell",
  "py",
]);

/**
 * Strict rehype-sanitize schema — extends the safe default.
 * Removes: iframe, object, embed, form, script, style, base, meta.
 * Explicitly allows: code class attributes (for syntax highlighting).
 */
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // Allow language-* class on code blocks for syntax highlighting
    code: [...(defaultSchema.attributes?.code ?? []), ["className", /^language-/]],
    // Strip all href-bearing elements from raw HTML — handled by our component override
    a: ["href", "title"],
  },
  // Never allow these tags even if react-markdown emits them from raw HTML
  tagNames: (defaultSchema.tagNames ?? []).filter(
    (t) => !["script", "style", "iframe", "object", "embed", "form", "base", "meta"].includes(t)
  ),
  protocols: {
    href: ["https", "http"],
    src: ["https", "http"],
    cite: ["https", "http"],
  },
};

export const MarkdownRenderer = ({ content, fontSize }: MarkdownRendererProps) => {
  const { t } = useTranslation();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
      toast({ title: t("markdown.codeCopied") });
    } catch {
      toast({ title: t("markdown.copyFailed"), variant: "destructive" });
    }
  };

  return (
    <div className={`prose prose-invert max-w-none ${fontSizeClasses[fontSize]}`}>
      <ReactMarkdown
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={{
          // ── Links ──────────────────────────────────────────────────────────
          // All hrefs validated; external always sandboxed.
          a({ href, children, ...props }) {
            const safeHref = safeLinkHref(href);
            const isExternal =
              safeHref !== "#" &&
              (safeHref.startsWith("https://") || safeHref.startsWith("http://"));
            return (
              <a
                {...props}
                href={safeHref}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-1 text-accent-cyan hover:underline"
              >
                {children}
                {isExternal && <ExternalLink className="inline h-3 w-3" strokeWidth={1.5} />}
              </a>
            );
          },

          img({ alt }) {
            return <span className="text-text-muted">[{t("markdown.remoteImageBlocked")}{alt ? `: ${alt}` : ""}]</span>;
          },

          // ── Code blocks ────────────────────────────────────────────────────
          code({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & { node?: unknown }) {
            const match = /language-(\w+)/.exec(className ?? "");
            const language = match ? match[1] : "";
            const codeString = String(children).replace(/\n$/, "");
            const isInline = !className?.includes("language-");

            if (!isInline && language && SUPPORTED_LANGUAGES.has(language)) {
              return (
                <div className="relative group">
                  <div className="absolute end-2 top-2 z-10">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleCopyCode(codeString)}
                      aria-label={t("markdown.copyCode")}
                      className="h-8 w-8 bg-black/50 p-0 opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      {copiedCode === codeString ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <SyntaxHighlighter
                    style={oneLight as Record<string, React.CSSProperties>}
                    language={language}
                    PreTag="div"
                    className="rounded-lg"
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }

            if (!isInline) {
              return (
                <pre className="overflow-x-auto rounded-lg border border-stroke-subtle bg-white p-3 text-sm text-black">
                  <code {...props}>{codeString}</code>
                </pre>
              );
            }

            return (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          },

          // ── Block elements (text-only, no raw HTML pass-through) ───────────
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 text-foreground">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold mb-3 text-foreground">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mb-2 text-foreground">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mb-3 text-foreground/90 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-4 space-y-1 text-foreground/90">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 space-y-1 text-foreground/90">{children}</ol>
          ),
          li: ({ children }) => <li className="ms-4">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="mb-4 border-s-4 border-primary/40 ps-4 italic text-foreground/80">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
