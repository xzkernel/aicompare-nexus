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
import ReactMarkdown from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
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
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
      toast({ title: "Code copied" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
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

          // ── Code blocks ────────────────────────────────────────────────────
          code({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & { node?: unknown }) {
            const match = /language-(\w+)/.exec(className ?? "");
            const language = match ? match[1] : "";
            const codeString = String(children).replace(/\n$/, "");
            const isInline = !className?.includes("language-");

            if (!isInline && language) {
              return (
                <div className="relative group">
                  <div className="absolute right-2 top-2 z-10">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleCopyCode(codeString)}
                      className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copiedCode === codeString ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <SyntaxHighlighter
                    style={oneDark as Record<string, React.CSSProperties>}
                    language={language}
                    PreTag="div"
                    className="rounded-lg"
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
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
          li: ({ children }) => <li className="ml-4">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/40 pl-4 italic mb-4 text-foreground/80">
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
