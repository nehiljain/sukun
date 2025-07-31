// New render function that uses the Django backend
export const renderVideo = async ({
  videoProjectId,
  renderResolution,
  renderSpeed,
}: {
  videoProjectId: string;
  renderResolution: string;
  renderSpeed: string;
}) => {
  console.log("Rendering video with backend API", { videoProjectId });

  // Prepare the request body
  const body = {
    video_project_id: videoProjectId,
    resolution: renderResolution,
    render_speed: renderSpeed,
  };

  // Call the backend render endpoint
  const csrfToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrftoken="))
    ?.split("=")[1];
  const response = await fetch(`/api/render-videos/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken || "",
    },
    body: JSON.stringify(body),
    credentials: "include",
  });

  const data = await response.json();
  console.log("Video render response", { data });

  if (!response.ok) {
    throw new Error(data.error || "Failed to render video");
  }

  return data;
};

// Function to check render progress
export const checkRenderProgress = async (renderVideoId: string) => {
  const csrfToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrftoken="))
    ?.split("=")[1];

  const response = await fetch(`/api/render-videos/${renderVideoId}/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken || "",
    },
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to check render progress");
  }

  return data;
};
