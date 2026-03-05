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
    expect(res.body).toEqual({
      ok: true,
      data: {
        platform: "github",
        username: "octocat",
        exists: true,
        verified: true,
        profileUrl: "https://github.com/octocat",
        note: undefined
      }
    });
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
        code: "UPSTREAM_UNAVAILABLE",
        message: "Username verification provider is temporarily unavailable."
      }
    });
  });

  it("returns verify unavailable for reddit forbidden", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 403 })));

    const req = createMockReq({ platform: "reddit", username: "someuser" });
    const res = createMockRes();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      data: {
        platform: "reddit",
        username: "someuser",
        exists: null,
        verified: false,
        profileUrl: "https://www.reddit.com/user/someuser/",
        note: "check blocked"
      }
    });
  });
});
