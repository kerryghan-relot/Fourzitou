import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/uploads/*", () => {
    return HttpResponse.json({ error: "Not found" }, { status: 404 });
  }),
];
