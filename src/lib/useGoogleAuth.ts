"use client";
import { useEffect, useState } from "react";

interface GoogleUser {
  email: string;
  name: string;
  picture: string;
}

// Generate PKCE code verifier and challenge
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function generateCodeChallenge(verifier: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function useGoogleAuth() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load token from localStorage
    const token = localStorage.getItem("google_access_token");
    const userData = localStorage.getItem("google_user");

    if (token && userData) {
      setAccessToken(token);
      setUser(JSON.parse(userData));
    }
    setIsLoading(false);
  }, []);

  async function signIn() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    console.log("Client ID:", clientId);

    if (!clientId) {
      alert("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID in environment variables");
      return;
    }

    // Generate PKCE verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Store verifier for the callback
    sessionStorage.setItem("pkce_code_verifier", codeVerifier);

    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = [
      "https://www.googleapis.com/auth/presentations",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ].join(" ");

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      access_type: "online",
    })}`;

    console.log("Redirecting to:", authUrl);
    window.location.href = authUrl;
  }

  function signOut() {
    localStorage.removeItem("google_access_token");
    localStorage.removeItem("google_user");
    setAccessToken(null);
    setUser(null);
  }

  return {
    accessToken,
    user,
    isLoading,
    isSignedIn: !!accessToken,
    signIn,
    signOut,
  };
}
