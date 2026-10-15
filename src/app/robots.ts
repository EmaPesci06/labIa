import type { MetadataRoute } from "next";

import { construirRobots } from "@/lib/seo/robots";
import { urlDelSitio } from "@/lib/sitio";

export default function robots(): MetadataRoute.Robots {
  return construirRobots({
    vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
    sitio: urlDelSitio(),
  });
}
