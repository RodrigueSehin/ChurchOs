import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Téléversements (documents : 25 Mo ; justificatifs de dépense : 5 fichiers de 10 Mo) — la
      // limite par défaut de 1 Mo rejetterait le moindre fichier. Les limites par fichier restent
      // contrôlées côté action et par les buckets Storage.
      bodySizeLimit: "55mb",
    },
  },
};

export default nextConfig;
