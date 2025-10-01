import { google } from "googleapis";
import http from "node:http";
import open from "open"; // npm i open

const SCOPES = [
  "https://www.googleapis.com/auth/presentations",
  "https://www.googleapis.com/auth/drive.file",
  "openid", "email", "profile",
];

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error("Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET in .env.local");
  process.exit(1);
}

// 1) Start a local server on a random free port
const server = http.createServer();
server.listen(0, async () => {
  const port = server.address().port;
  const redirectUri = `http://localhost:${port}/oauth2callback`;

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  // 2) Build URL with offline access + consent to ensure refresh_token
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });

  console.log("\nOpening browser for Google authorization…\n", authUrl, "\n");
  try { await open(authUrl); } catch { /* if it can't auto-open, just click the URL */ }

  // 3) Handle the callback and exchange the code
  server.on("request", async (req, res) => {
    if (!req.url.startsWith("/oauth2callback")) {
      res.writeHead(404).end("Not found");
      return;
    }
    const url = new URL(req.url, `http://localhost:${port}`);
    const code = url.searchParams.get("code");

    if (!code) {
      res.writeHead(400).end("Missing code");
      return;
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h1>All set!</h1><p>You can close this window.</p>");

      console.log("\nACCESS TOKEN:", tokens.access_token || "(received)");
      console.log("REFRESH TOKEN:", tokens.refresh_token || "(none — ensure prompt=consent)");
      console.log("\nAdd this to .env.local:\nGOOGLE_REFRESH_TOKEN=" + (tokens.refresh_token || "RETRY"));
    } catch (e) {
      console.error("Token exchange failed:", e?.message || e);
      res.writeHead(500).end("Token exchange failed. Check console.");
    } finally {
      server.close();
    }
  });
});
