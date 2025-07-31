import VerticalTimeline, {
  type TimelineItem,
} from "@/components/ui/vertical-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function TimelinePage() {
  const [releases, setReleases] = useState<TimelineItem[]>([]);
  const [searchParams] = useSearchParams();
  const repo_name = searchParams.get("repo_name");
  const baseUrl = `${window.location.protocol}//${window.location.host}/api/`;

  useEffect(() => {
    console.log("useEffect called");
    console.log(repo_name, baseUrl);
    const fetchReleases = async () => {
      try {
        const response = await fetch(
          `${baseUrl}semantic-releases?repo_name=${repo_name}`,
          {
            method: "GET",
            credentials: "include",
          },
        );
        if (!response.ok) {
          throw new Error("Failed to fetch releases");
        }
        const data: TimelineItem[] = await response.json();
        console.log(data);
        setReleases(data);
      } catch (error) {
        console.error("Error fetching releases:", error);
        // Handle error (e.g., show error message to user)
      }
    };

    if (repo_name) {
      console.log("fetchReleases called");
      fetchReleases();
    }
  }, [repo_name, baseUrl]);

  return (
    <div className="flex container mx-auto py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Changelog - {repo_name}</CardTitle>
        </CardHeader>
        <CardContent>
          <VerticalTimeline items={releases} />
        </CardContent>
      </Card>
    </div>
  );
}
