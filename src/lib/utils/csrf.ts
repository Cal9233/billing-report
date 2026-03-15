let csrfToken: string | null = null;

export async function getCSRFToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }

  try {
    const response = await fetch("/api/csrf-token", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to get CSRF token");
    }

    const data = await response.json();
    csrfToken = data.token as string;
    return csrfToken;
  } catch (error) {
    console.error("CSRF token fetch error:", error);
    throw error;
  }
}

export async function addCSRFToken(options: RequestInit): Promise<RequestInit> {
  const token = await getCSRFToken();
  return {
    ...options,
    headers: {
      ...options.headers,
      "x-csrf-token": token,
    },
  };
}
