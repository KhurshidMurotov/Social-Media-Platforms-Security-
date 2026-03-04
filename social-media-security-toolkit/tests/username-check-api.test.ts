import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "@/pages/api/username-check";

type MockRes = {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  setHeader: (name: string, value: string) => MockRes;
  status: (code: number) => MockRes;
  json: (payload: unknown) => MockRes;
};

function createMockRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
}

function createMockReq(query: Record<string, string>) {
  return {
    method: "GET",
    query,
    headers: {},
    socket: { remoteAddress: "127.0.0.1" }
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/username-check", () => {
  it("returns success payload on valid upstream response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

    const req = createMockReq({ platform: "github", username: "octocat" });
    const res = createMockRes();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, data: { exists: true } });
  });

  it("maps upstream error to non-200 failure response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    const req = createMockReq({ platform: "github", username: "octocat" });
    const res = createMockRes();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({
      ok: false,
      error: {
        code: "UPSTREAM_REQUEST_FAILED",
        message: "Username verification request failed."
      }
    });
  });
});

