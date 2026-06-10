export default async function handler(req, res) {
  const { code } = req.query;
  const client_id = process.env.GITHUB_CLIENT_ID;
  const client_secret = process.env.GITHUB_CLIENT_SECRET;
  
  if (!client_id || !client_secret) {
    res.status(500).send("Configuration Error: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is not set in Vercel environment variables.");
    return;
  }

  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const redirect_uri = `${protocol}://${host}/api/callback`;

  if (!code) {
    res.status(400).send("Authentication Error: Authorization code not provided by GitHub.");
    return;
  }

  try {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id,
        client_secret,
        code,
        redirect_uri,
      }),
    });

    const data = await response.json();

    if (data.error) {
      res.status(400).send(`OAuth Error: ${data.error_description || data.error}`);
      return;
    }

    const token = data.access_token;
    
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorizing...</title>
      </head>
      <body>
        <p>Authorizing, please wait...</p>
        <script>
          const token = "${token}";
          
          // Communicate back to Decap CMS popup handler
          window.opener.postMessage("authorizing:github", "*");
          
          window.opener.postMessage(
            "authorization:github:success:" + JSON.stringify({ token: token, provider: "github" }),
            "*"
          );
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`Server Error: ${error.message}`);
  }
}
