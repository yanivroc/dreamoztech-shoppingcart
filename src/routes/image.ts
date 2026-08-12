import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const src = url.searchParams.get("src");

        if (!src || !/^https?:\/\//i.test(src)) {
          return new Response("Invalid image source", { status: 400 });
        }

        const blobTokenMatch = src.match(/(vercel_blob_[A-Za-z0-9_-]+)/);
        const headers = new Headers();
        headers.set("accept", request.headers.get("accept") ?? "*/*");
        if (blobTokenMatch) {
          headers.set("authorization", `Bearer ${blobTokenMatch[1]}`);
        }

        let fetched: Response;
        try {
          fetched = await fetch(src, {
            method: "GET",
            headers,
            redirect: "follow",
          });
        } catch (error) {
          console.error("Image proxy fetch failed:", error);
          return new Response("Failed to fetch image", { status: 502 });
        }

        const contentType = fetched.headers.get("content-type");
        const responseHeaders = new Headers();
        if (contentType) {
          responseHeaders.set("content-type", contentType);
        }
        const cacheControl = fetched.headers.get("cache-control");
        if (cacheControl) {
          responseHeaders.set("cache-control", cacheControl);
        } else {
          responseHeaders.set("cache-control", "public, max-age=3600");
        }

        return new Response(fetched.body, {
          status: fetched.status,
          headers: responseHeaders,
        });
      },
    },
  },
});
