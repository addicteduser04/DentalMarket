/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const storageHostname = supabaseUrl ? new URL(supabaseUrl).hostname : null;
const nextConfig = {
  images: {
    remotePatterns: storageHostname ? [{ protocol: "https", hostname: storageHostname, pathname: "/storage/v1/object/public/**" }] : []
  }
};
export default nextConfig;
