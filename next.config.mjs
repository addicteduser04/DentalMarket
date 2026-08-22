/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const storageHostname = supabaseUrl ? new URL(supabaseUrl).hostname : null;
const nextConfig = {
  experimental: { useTypeScriptCli: false },
  images: {
    remotePatterns: [
      ...(storageHostname ? [{ protocol: "https", hostname: storageHostname, pathname: "/storage/v1/object/public/**" }] : []),
      { protocol: "https", hostname: "dentalmarket.ma", pathname: "/wp-content/uploads/**" }
    ]
  }
};
export default nextConfig;
