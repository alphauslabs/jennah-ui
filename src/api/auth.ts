//Handles user authentication via oauth2-proxy built-in endpoints

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  provider: string;
}
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (import.meta.env.DEV) {
    const email = import.meta.env.VITE_DEV_EMAIL || "dev@example.com";
    return {
      id: import.meta.env.VITE_DEV_USER_ID || "dev-user-123",
      email,
      name: email.split("@")[0],
      provider: "github",
    };
  }

  try {
    const response = await fetch("/oauth2/userinfo", {
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return {
      id: data.user,
      email: data.user,
      name: data.user.split("@")[0],
      provider: "github",
    };
  } catch (error) {
    console.error("Failed to get current user:", error);
    return null;
  }
}

export function redirectToOAuthLogin(): void {

  const currentPath = window.location.pathname;
  const isAuthPage = currentPath === "/auth/login" || currentPath === "/auth/register" || currentPath === "/";
  const returnUrl = encodeURIComponent(isAuthPage ? "/jobs" : currentPath);
  window.location.href = `/oauth2/sign_in?rd=${returnUrl}`;
}

export async function logoutOAuth(): Promise<void> {
  window.location.href = "/oauth2/sign_out?rd=%2Fauth%2Flogin";
}


export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}