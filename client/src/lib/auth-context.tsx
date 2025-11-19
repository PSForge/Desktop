import { createContext, useContext, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User, FeatureAccess } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  featureAccess: FeatureAccess | null;
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: string;
  } | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, referralSource?: string | null) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<{
    user: User;
    subscription: {
      id: string;
      status: string;
      currentPeriodEnd: string;
    } | null;
    featureAccess: FeatureAccess;
  }>({
    queryKey: ["/auth/me"],
    retry: false,
    refetchOnWindowFocus: false,
    meta: {
      ignoreGlobalErrorHandler: true,
    },
  });

  useEffect(() => {
    if (!isLoading) {
      setIsInitialized(true);
    }
  }, [isLoading]);

  // Handle 401 errors gracefully - treat as anonymous/not authenticated
  const isUnauthenticated = error && (error as any)?.message?.includes('401');
  const user = isUnauthenticated ? null : (data?.user || null);
  const subscription = isUnauthenticated ? null : (data?.subscription || null);
  const featureAccess = isUnauthenticated ? null : (data?.featureAccess || null);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await apiRequest("/auth/login", "POST", { email, password });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/auth/me"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ email, password, name, referralSource }: { email: string; password: string; name: string; referralSource?: string | null }) => {
      const response = await apiRequest("/auth/register", "POST", { email, password, name, referralSource });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/auth/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/auth/logout", "POST", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/auth/me"] });
      queryClient.clear();
    },
  });

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const register = async (email: string, password: string, name: string, referralSource?: string | null) => {
    await registerMutation.mutateAsync({ email, password, name, referralSource });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const value: AuthContextType = {
    user,
    isLoading: !isInitialized || isLoading,
    isAuthenticated: !!user,
    featureAccess,
    subscription,
    login,
    register,
    logout,
    refetch: async () => {
      await refetch();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
