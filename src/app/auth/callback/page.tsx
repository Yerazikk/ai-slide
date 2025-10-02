"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      // Get authorization code from URL
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (!code) {
        console.error("No authorization code found");
        router.push("/");
        return;
      }

      // Get PKCE verifier from session storage
      const codeVerifier = sessionStorage.getItem("pkce_code_verifier");
      if (!codeVerifier) {
        console.error("No PKCE verifier found");
        router.push("/");
        return;
      }

      try {
        // Exchange code for access token via our server endpoint
        const tokenResponse = await fetch("/api/auth/exchange", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            codeVerifier,
            redirectUri: `${window.location.origin}/auth/callback`,
          }),
        });

        const tokens = await tokenResponse.json();

        console.log("Token response:", tokens);

        if (tokens.error) {
          console.error("Token exchange error:", tokens.error, tokens.error_description);
          throw new Error(`Token exchange failed: ${tokens.error_description || tokens.error}`);
        }

        if (!tokens.access_token) {
          throw new Error("No access token received");
        }

        // Fetch user info
        const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        const user = await userResponse.json();

        // Store in localStorage
        localStorage.setItem("google_access_token", tokens.access_token);
        localStorage.setItem("google_user", JSON.stringify(user));

        // Clean up session storage
        sessionStorage.removeItem("pkce_code_verifier");

        // Redirect to home
        router.push("/");
      } catch (err) {
        console.error("Failed to exchange code for token:", err);
        router.push("/");
      }
    }

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#13131A] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-2xl mb-4">Authenticating...</div>
        <div className="text-[#606065]">Please wait while we sign you in</div>
      </div>
    </div>
  );
}
