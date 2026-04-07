import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { fetchDesktopLicense, getDesktopAuthHeader, getDesktopRequestUrl, isDesktopRemoteAuthEnabled, mapDesktopLicenseToAuthPayload } from "@/lib/desktop-auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

async function desktopBridgeFetch(
  url: string,
  init: { method: string; headers?: Record<string, string>; body?: string; credentials?: RequestCredentials },
) {
  if (typeof window !== "undefined" && window.psforgeDesktop?.request) {
    const response = await window.psforgeDesktop.request({
      url,
      method: init.method,
      headers: init.headers,
      body: init.body,
    });

    return {
      ok: response.ok,
      status: response.status,
      statusText: `${response.status}`,
      text: async () => response.text,
      json: async () => JSON.parse(response.text),
    } as Response;
  }

  return fetch(url, init) as Promise<Response>;
}

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<Response> {
  const desktopRemoteAuth = isDesktopRemoteAuthEnabled();
  const requestUrl = desktopRemoteAuth ? getDesktopRequestUrl(url) : url;
  const res = await desktopBridgeFetch(requestUrl, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(desktopRemoteAuth ? getDesktopAuthHeader() : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: desktopRemoteAuth ? "omit" : "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const queryPath = queryKey.join("/") as string;
    const desktopRemoteAuth = isDesktopRemoteAuthEnabled();

    if (desktopRemoteAuth && queryPath === "/auth/me") {
      try {
        await fetchDesktopLicense();
        return mapDesktopLicenseToAuthPayload();
      } catch (error: any) {
        if (unauthorizedBehavior === "returnNull" && String(error?.message || "").includes("401")) {
          return null;
        }
        throw error;
      }
    }

    const res = await desktopBridgeFetch(desktopRemoteAuth ? getDesktopRequestUrl(queryPath) : queryPath, {
      method: "GET",
      headers: desktopRemoteAuth ? getDesktopAuthHeader() : undefined,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
