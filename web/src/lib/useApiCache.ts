import { useState, useEffect, useCallback } from "react";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CacheItem<T> {
  data: T[];
  timestamp: number;
}

export function useApiCache<
  T extends { generated_at: string; repo_name: string },
>(url: string) {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const sortData = useCallback((data: T[]) => {
    return data.sort((a, b) => {
      // First, sort by generated_at in descending order
      const dateComparison =
        new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime();
      if (dateComparison !== 0) return dateComparison;

      // If generated_at is the same, sort by repo_name
      return a.repo_name.localeCompare(b.repo_name);
    });
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const cacheKey = `api_cache_${url}`;

    if (typeof window !== "undefined") {
      const cachedItem = localStorage.getItem(cacheKey);

      if (cachedItem) {
        const { data, timestamp }: CacheItem<T> = JSON.parse(cachedItem);
        if (Date.now() - timestamp < CACHE_TTL) {
          setData(sortData(data));
          setIsLoading(false);
          return;
        }
      }
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result: T[] = await response.json();
      const sortedResult = sortData(result);
      setData(sortedResult);
      if (typeof window !== "undefined") {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: sortedResult,
            timestamp: Date.now(),
          }),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("An error occurred"));
    } finally {
      setIsLoading(false);
    }
  }, [url, sortData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(`api_cache_${url}`);
    }
    fetchData();
  }, [url, fetchData]);

  return { data, isLoading, error, refetch };
}
