import { createServerFn } from "@tanstack/react-start";

export const getGoogleMapsConfig = createServerFn({ method: "GET" }).handler(async () => {
  return {
    browserKey: process.env.GOOGLE_MAPS_BROWSER_KEY?.trim() ?? "",
    trackingId: process.env.GOOGLE_MAPS_TRACKING_ID?.trim() ?? "",
  };
});
