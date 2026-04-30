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
  it("returns success payload on direct github profile response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('<html><meta name="octolytics-dimension-user_login" content="octocat"><title>octocat</title></html>', {
          status: 200
        })
      )
    );

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

  it("marks instagram username as found from the public profile JSON payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('{"data":{"user":{"username":"instagram"}}}', {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8" }
        })
      )
    );

    const req = createMockReq({ platform: "instagram", username: "instagram" });
    const res = createMockRes();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      data: {
        platform: "instagram",
        username: "instagram",
        exists: true,
        verified: true,
        profileUrl: "https://www.instagram.com/instagram/",
        note: undefined
      }
    });
  });

  it("marks x username as found only when the page embeds the exact handle payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('<script>window.__INITIAL_STATE__={"entities":{"users":{"entities":{"12":{"screen_name":"jack"}}}}}</script>', {
          status: 200
        })
      )
    );

    const req = createMockReq({ platform: "x", username: "jack" });
    const res = createMockRes();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      data: {
        platform: "x",
        username: "jack",
        exists: true,
        verified: true,
        profileUrl: "https://x.com/jack",
        note: undefined
      }
    });
  });

  it("marks x username as not found when the public page loads without the requested handle payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response('<script>window.__INITIAL_STATE__={"entities":{"users":{"entities":{}}}}</script>', { status: 200 }))
    );

    const req = createMockReq({ platform: "x", username: "ghost_handle_12345" });
    const res = createMockRes();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      data: {
        platform: "x",
        username: "ghost_handle_12345",
        exists: false,
        verified: true,
        profileUrl: "https://x.com/ghost_handle_12345",
        note: undefined
      }
    });
  });

  it("checks reddit through the public profile page endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("<html><title>overview for spez</title></html>", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const req = createMockReq({ platform: "reddit", username: "spez" });
    const res = createMockRes();

    await handler(req as never, res as never);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://old.reddit.com/user/spez/");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      data: {
        platform: "reddit",
        username: "spez",
        exists: true,
        verified: true,
        profileUrl: "https://www.reddit.com/user/spez/",
        note: undefined
      }
    });
  });

  it("marks youtube handle as found only when the page embeds the exact handle metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          '<title>Google - YouTube</title><script>{"canonicalBaseUrl":"/@Google","vanityChannelUrl":"http://www.youtube.com/@Google"}</script>',
          { status: 200 }
        )
      )
    );

    const req = createMockReq({ platform: "youtube", username: "Google" });
    const res = createMockRes();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      data: {
        platform: "youtube",
        username: "Google",
        exists: true,
        verified: true,
        profileUrl: "https://www.youtube.com/@Google",
        note: undefined
      }
    });
  });

  it("returns verify unavailable when facebook blocks the public profile page", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<title>Error Facebook</title>", { status: 400 })));

    const req = createMockReq({ platform: "facebook", username: "someuser" });
    const res = createMockRes();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      data: {
        platform: "facebook",
        username: "someuser",
        exists: null,
        verified: false,
        profileUrl: "https://www.facebook.com/someuser",
        note: "public Facebook profile check was blocked"
      }
    });
  });
});
