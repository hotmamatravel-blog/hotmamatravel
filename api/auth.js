export default function handler(req, res) {
  const client_id = process.env.GITHUB_CLIENT_ID;
  if (!client_id) {
    res.status(500).send("Configuration Error: GITHUB_CLIENT_ID is not set in Vercel environment variables.");
    return;
  }
  
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const redirect_uri = `${protocol}://${host}/api/callback`;
  
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=repo,user&state=auth`;
  
  res.writeHead(307, { Location: githubAuthUrl });
  res.end();
}
