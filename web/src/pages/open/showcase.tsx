import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import { Link } from "react-router-dom";
import { PageLoader } from "@/components/ui/page-loader";

interface VideoMetadata {
  id: string;
  title: string;
  video_url: string;
  author: {
    name: string;
    avatar_url: string;
  };
}

export default function Showcase() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [thumbnailFormat, setThumbnailFormat] = useState<
    Record<string, string>
  >({});

  const navigateToDashboard = () => {
    window.location.href = "/";
  };

  useEffect(() => {
    const fetchShowcase = async () => {
      try {
        const response = await fetch(
          "https://storage.googleapis.com/demodrive-media/gallery/metadata.json",
        );

        if (!response.ok) {
          throw new Error("Failed to fetch showcase data");
        }

        const data = await response.json();
        console.log(data);
        setVideos(data.videos);
        setLoading(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load showcase",
        );
        setLoading(false);
      }
    };

    fetchShowcase();
  }, []);

  const handleImageError = (videoId: string, currentFormat: string) => {
    const newFormat = currentFormat === "jpg" ? "png" : "jpg";
    setThumbnailFormat((prev) => ({
      ...prev,
      [videoId]: newFormat,
    }));
  };

  return (
    <>
      <Navbar
        buttons={[
          {
            label: "Sign In",
            onClick: navigateToDashboard,
            variant: "primary",
          },
        ]}
      />

      {loading ? (
        <PageLoader />
      ) : error ? (
        <div className="flex justify-center items-center min-h-[300px] text-red-500">
          Error: {error}
        </div>
      ) : (
        <div className="container w-[95%] md:w-2/3 mx-auto text-center text-white px-4 pt-24 pb-12">
          <h1 className="text-3xl font-bold mb-8 pt-20">Video Showcase</h1>
          <p className="text-lg mb-8">
            {" "}
            Use DemoDrive to generate AI videos for product walkthroughs,
            explainers, and more. Browse our showcase of AI videos to get
            inspired. Also check out{" "}
            <Link
              to="/animations"
              className="text-accent font-medium hover:text-accent/80 underline underline-offset-2 transition-colors"
            >
              Animations
            </Link>{" "}
            to see what you can use to create your own videos.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => {
              const videoPath = video.video_url
                .split("demodrive-media/")[1]
                .split("/metadata.json")[0];
              const format = thumbnailFormat[video.id] || "jpg";
              return (
                <Link
                  key={video.id}
                  to={`/video-player/${btoa(videoPath)}`}
                  className="group"
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={`https://storage.googleapis.com/demodrive-media/${videoPath}/thumbnail.${format}`}
                        alt={video.title}
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={() => handleImageError(video.id, format)}
                      />
                    </div>
                  </Card>
                  <div className="p-4 text-left text-white">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden relative">
                        <img
                          src={video.author.avatar_url}
                          alt={video.author.name}
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg line-clamp-1">
                          {video.title}
                        </h3>
                        <p className="text-sm">{video.author.name}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
