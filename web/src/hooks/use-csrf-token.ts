import { useState, useEffect } from "react";

export const useCSRFToken = () => {
  const [csrfToken, setCSRFToken] = useState<string>("");

  const getCSRFToken = (): string => {
    return (
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1] || ""
    );
  };

  useEffect(() => {
    // Set initial token
    setCSRFToken(getCSRFToken());

    // Create an interval to check for token updates
    const intervalId = setInterval(() => {
      const newToken = getCSRFToken();
      if (newToken !== csrfToken) {
        setCSRFToken(newToken);
      }
    }, 1000); // Check every second

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [csrfToken]);

  return csrfToken;
};
