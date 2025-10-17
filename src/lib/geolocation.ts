"use server";

import { headers } from "next/headers";

export interface Geolocation {
  city: string;
  latitude: string;
  longitude: string;
}

export async function getLocation(): Promise<Geolocation> {
  if (process.env.NODE_ENV === "development")
    return {
      city: "San Francisco",
      latitude: "37.7749",
      longitude: "-122.4194",
    };

  const requestHeaders = await headers();

  const city =
    decodeURIComponent(requestHeaders.get("x-vercel-ip-city") ?? "") ??
    "Unknown";

  const longitude = requestHeaders.get("x-vercel-ip-longitude") ?? "Unknown";
  const latitude = requestHeaders.get("x-vercel-ip-latitude") ?? "Unknown";

  return {
    city,
    latitude,
    longitude,
  };
}
