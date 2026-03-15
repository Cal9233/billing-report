import useSWR, { SWRConfiguration } from "swr";
import { addCSRFToken } from "@/lib/utils/csrf";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

async function fetcher(url: string) {
  const response = await fetch(`${API_BASE}${url}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error: any = new Error("API request failed");
    error.status = response.status;
    error.info = await response.json();
    throw error;
  }

  return response.json();
}

async function mutationFetcher(
  url: string,
  options: RequestInit = {}
): Promise<any> {
  const finalOptions = await addCSRFToken(options);

  const response = await fetch(`${API_BASE}${url}`, {
    ...finalOptions,
    credentials: "include",
  });

  if (!response.ok) {
    const error: any = new Error("API request failed");
    error.status = response.status;
    error.info = await response.json();
    throw error;
  }

  return response.json();
}

/**
 * Hook for fetching data with caching and revalidation
 */
export function useAPI<T>(
  endpoint: string,
  config?: SWRConfiguration
) {
  return useSWR<T, Error>(endpoint ? `/api${endpoint}` : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 60000, // 1 minute
    focusThrottleInterval: 300000, // 5 minutes
    ...config,
  });
}

/**
 * Hook for GET requests
 */
export function useGet<T>(endpoint: string, config?: SWRConfiguration) {
  return useAPI<T>(endpoint, config);
}

/**
 * Hook for creating/updating data
 */
export async function useCreate<T>(
  endpoint: string,
  data: any
): Promise<T> {
  return mutationFetcher(`/api${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

/**
 * Hook for updating data
 */
export async function useUpdate<T>(
  endpoint: string,
  data: any
): Promise<T> {
  return mutationFetcher(`/api${endpoint}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

/**
 * Hook for deleting data
 */
export async function useDelete(endpoint: string): Promise<any> {
  return mutationFetcher(`/api${endpoint}`, {
    method: "DELETE",
  });
}

/**
 * Hook for patching data
 */
export async function usePatch<T>(
  endpoint: string,
  data: any
): Promise<T> {
  return mutationFetcher(`/api${endpoint}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}
