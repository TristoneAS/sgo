/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite abrir el app en red interna por hostname (ej. http://tftdelsrv011:3035)
  allowedDevOrigins: ["tftdelsrv011", "localhost", "127.0.0.1"],
};

export default nextConfig;
