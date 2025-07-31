import React from "react";
import { cn } from "@/lib/utils";

// Simple HTML sanitization function
const sanitizeHtml = (html: string): string => {
  // This is a basic implementation - consider using a proper library like DOMPurify in production
  const element = document.createElement("div");
  element.innerHTML = html;

  // Remove potentially dangerous elements and attributes
  const scriptTags = element.querySelectorAll("script");
  scriptTags.forEach((script) => script.remove());

  const elements = element.querySelectorAll("*");
  elements.forEach((el) => {
    // Remove event handlers and javascript: URLs
    const attributes = Array.from(el.attributes);
    attributes.forEach((attr) => {
      if (
        attr.name.startsWith("on") ||
        (attr.name === "href" && attr.value.startsWith("javascript:"))
      ) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return element.innerHTML;
};

interface HtmlRendererProps {
  content: string;
  className?: string;
}

export const HtmlRenderer: React.FC<HtmlRendererProps> = ({
  content,
  className,
}) => {
  // If there's no content, return null
  if (!content) return null;

  // Sanitize the HTML content
  const sanitizedContent = sanitizeHtml(content);

  return (
    <div
      className={cn("prose prose-sm max-w-none dark:prose-invert", className)}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
};
