import type { NextApiResponse } from "next";

export type ApiErrorBody = {
  code: string;
  message: string;
};

export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiFailure = {
  ok: false;
  error: ApiErrorBody;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function sendOk<T>(res: NextApiResponse<ApiResponse<T>>, data: T, status = 200) {
  return res.status(status).json({ ok: true, data });
}

export function sendError(
  res: NextApiResponse,
  status: number,
  code: string,
  message: string,
  headers?: Record<string, string>
) {
  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
  }
  return res.status(status).json({ ok: false, error: { code, message } });
}

export function mapUpstreamStatus(status: number): 401 | 403 | 429 | 502 | 503 {
  if (status === 401) return 401;
  if (status === 403) return 403;
  if (status === 429) return 429;
  if (status >= 500) return 503;
  return 502;
}

