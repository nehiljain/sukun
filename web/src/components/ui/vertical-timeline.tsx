import ReactMarkdown from "react-markdown";
import { Button } from "./button";
import { Mail, Twitter } from "lucide-react";

interface TimelineItem {
  header_image_url: string;
  footer_image_url: string;
  release: Release;
  release_body: string;
  release_summary: string;
}

interface Release {
  release_date: string;
  release_name: string;
}

interface VerticalTimelineProps {
  items?: TimelineItem[];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function VerticalTimeline({
  items = [],
}: VerticalTimelineProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8">No timeline items to display.</div>
    );
  }

  const shareOnTwitter = (
    item: TimelineItem,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    console.log("shareOnTwitter called");
    function formatImageUrl(url: string) {
      if (!url) {
        return "";
      }
      const strippedUrl = url.replace(/\.[^/.]+$/, "");
      const urlSegments = strippedUrl.split("/");
      urlSegments[urlSegments.length - 1] =
        "carbon-" + urlSegments[urlSegments.length - 1];

      // Join the segments back together
      return urlSegments.join("/");
    }
    const imageUrl = item.header_image_url || item.footer_image_url;

    const tweetText = encodeURIComponent(
      formatImageUrl(imageUrl) + "\n" + item.release_summary,
    );
    const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
    window.open(tweetUrl, "_blank");
  };
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="relative ml-32 md:ml-44">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-muted"></div>

        {items.map((item, index) => (
          <div key={index} className="mb-12 relative">
            {/* Date */}
            <div className="absolute right-full mr-2 mt-2 w-40 text-right text-sm text-accent">
              {formatDate(item.release.release_date)}
            </div>

            {/* Timeline dot */}
            <div className="absolute left-5 -ml-3 mt-2 w-6 h-6 rounded-full bg-accent shadow-md"></div>

            {/* Content card */}
            <div className="ml-16 md:ml-28 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
              {/* Image */}
              {item.header_image_url && (
                <div className="mb-4">
                  <img
                    src={item.header_image_url}
                    alt={`Timeline item ${index + 1}`}
                    width={600}
                    height={200}
                    className="rounded-lg object-cover"
                  />
                </div>
              )}

              {/* Markdown content */}
              <div className="prose prose-sm max-w-none">
                <h1 className="text-4xl font-bold leading-loose">
                  {item.release.release_name}
                </h1>
                <ReactMarkdown
                  className="prose prose-sm max-w-none dark:prose-invert leading-relaxed"
                  components={{
                    h1: ({ ...props }) => (
                      <h1
                        className="text-2xl font-bold mt-4 leading-loose"
                        {...props}
                      />
                    ),
                    h2: ({ ...props }) => (
                      <h2
                        className="text-xl font-semibold mt-3 leading-loose"
                        {...props}
                      />
                    ),
                    h3: ({ ...props }) => (
                      <h3
                        className="text-lg font-medium mb-2 leading-relaxed"
                        {...props}
                      />
                    ),
                    p: ({ ...props }) => (
                      <p className="leading-relaxed" {...props} />
                    ),
                    ul: ({ ...props }) => (
                      <ul
                        className="list-disc list-inside leading-relaxed"
                        {...props}
                      />
                    ),
                    ol: ({ ...props }) => (
                      <ol
                        className="list-decimal list-inside leading-relaxed"
                        {...props}
                      />
                    ),
                    li: ({ ...props }) => (
                      <li className="leading-relaxed" {...props} />
                    ),
                    img: ({ ...props }) => (
                      <img
                        className="rounded-lg object-cover mx-auto"
                        {...props}
                      />
                    ),
                    a: ({ ...props }) => (
                      <a
                        className="font-medium text-accent underline underline-offset-4"
                        target="_blank"
                        {...props}
                      />
                    ),
                  }}
                >
                  {item.release_body}
                </ReactMarkdown>
              </div>
              {item.footer_image_url && (
                <div className="mt-4">
                  <img
                    src={item.footer_image_url}
                    alt={`Timeline item ${index + 1}`}
                    width={600}
                    height={200}
                    className="rounded-lg object-cover"
                  />
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="lg"
                className="mt-2 mr-2 text-accent hover:text-accent-foreground"
                onClick={(event) => shareOnTwitter(item, event)}
              >
                <Twitter className="h-4 w-4 mr-2" />
                <span>Tweet</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="mt-2 mr-2 text-accent hover:text-accent-foreground"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
