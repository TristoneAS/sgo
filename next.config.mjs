/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite abrir el app en red interna (hostname o IP)
  allowedDevOrigins: [
    "tftdelsrv011",
    "localhost",
    "127.0.0.1",
    "10.56.107.127",
  ],
};

export default nextConfig;
