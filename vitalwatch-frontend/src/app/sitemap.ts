import { MetadataRoute } from "next";

const BASE_URL = "https://vytalwatch.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const publicRoutes: {
    path: string;
    changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
    priority: number;
  }[] = [
    { path: "/", changeFrequency: "weekly", priority: 1.0 },
    { path: "/about", changeFrequency: "monthly", priority: 0.8 },
    { path: "/features", changeFrequency: "monthly", priority: 0.9 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.7 },
    { path: "/blog", changeFrequency: "daily", priority: 0.8 },
    { path: "/case-studies", changeFrequency: "monthly", priority: 0.8 },
    { path: "/careers", changeFrequency: "weekly", priority: 0.6 },
    { path: "/demo", changeFrequency: "monthly", priority: 0.9 },
    { path: "/docs", changeFrequency: "weekly", priority: 0.7 },
    { path: "/help", changeFrequency: "weekly", priority: 0.6 },
    { path: "/hipaa", changeFrequency: "yearly", priority: 0.5 },
    { path: "/integrations", changeFrequency: "monthly", priority: 0.8 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
    { path: "/devices", changeFrequency: "monthly", priority: 0.8 },
  ];

  return publicRoutes.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
