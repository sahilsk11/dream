import { hmacMd5Hex, md5Hex } from "./md5.ts";
import { parseWyzeJson } from "./json_safe.ts";
import { totp } from "./totp.ts";

/** Constants from wyze-sdk 2.2.0 (base.py, api_service.py, pluto_service.py). */
export const WYZE_APP_ID = "9319141212m2ik";
export const WYZE_APP_VERSION = "2.19.14";
export const WYZE_SIGNING_SECRET = "wyze_app_secret_key_132";
/** PlutoServiceClient.WYZE_APP_ID. The SDK does not pass this into ExServiceClient, so live requests send WYZE_APP_ID. */
export const PLUTO_APP_ID = "plup_9f2e5d49b9cd7725";
export const PLUTO_BASE = "https://wyze-pluto-service.wyzecam.com";
export const AUTH_BASE = "https://auth-prod.api.wyze.com";
export const API_BASE = "https://api.wyzecam.com";
export const WYZE_SC = "a626948714654991afd3c0dbd7cdb901";
export const SV_REFRESH_TOKEN = "d91914dd28b7492ab9dd17f7707d35a3";
export const SV_GET_DEVICE_LIST = "c417b62d72ee44bf933054bdca183e77";
export const WYZE_APP_NAME = "com.hualai";
export const SCALE_X_MODEL = "WL_SC3";
/** AuthServiceClient.WYZE_API_KEY — public SDK client header, not the account developer key. */
export const SDK_X_API_KEY = "RckMFKbsds5p6QY3COEXc2ABwNTYY0q18ziEiSEm";

export function nonceMs(now = Date.now()): number {
  return Math.round(now);
}

export function tripleMd5(password: string): string {
  return md5Hex(md5Hex(md5Hex(password)));
}

/** RequestVerifier.request_id: md5(str(md5(str(timestamp)))) */
export function requestId(timestamp: number | string): string {
  return md5Hex(md5Hex(String(timestamp)));
}

export function sortedQuery(params: Record<string, string | number>): string {
  return Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
}

/**
 * RequestVerifier.generate_dynamic_signature
 * HMAC-MD5(key = utf8(md5(access_token + signing_secret)), body)
 */
export function generateDynamicSignature(
  accessToken: string,
  body: string,
  signingSecret = WYZE_SIGNING_SECRET,
): string {
  const key = md5Hex(`${accessToken}${signingSecret}`);
  return hmacMd5Hex(key, body);
}

export type ExHeaders = {
  appid: string;
  appinfo: string;
  phoneid: string;
  requestid: string;
  access_token: string;
  "User-Agent": string;
  signature2?: string;
  [k: string]: string | undefined;
};

export function plutoHeaders(opts: {
  accessToken: string;
  phoneId: string;
  nonce: number;
  signature2: string;
}): ExHeaders {
  return {
    appid: WYZE_APP_ID,
    appinfo: `wyze_android_${WYZE_APP_VERSION}`,
    phoneid: opts.phoneId,
    requestid: requestId(opts.nonce),
    access_token: opts.accessToken,
    "User-Agent": `wyze_android_${WYZE_APP_VERSION}`,
    signature2: opts.signature2,
  };
}

export class WyzeHttpError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export class WyzeRateLimitError extends WyzeHttpError {
  constructor(body: unknown) {
    super("Wyze rate-limited login (HTTP 429). Backing off; will not retry login.", 429, body);
  }
}

export class WyzeMfaError extends Error {
  constructor(message: string) {
    super(message);
  }
}

type Json = Record<string, unknown>;

function asJson(data: unknown): Json {
  return data && typeof data === "object" ? (data as Json) : {};
}

function pickToken(data: Json): { access_token?: string; refresh_token?: string; user_id?: string } {
  const nested = asJson(data.data);
  return {
    access_token: (data.access_token ?? nested.access_token) as string | undefined,
    refresh_token: (data.refresh_token ?? nested.refresh_token) as string | undefined,
    user_id: (data.user_id ?? nested.user_id) as string | undefined,
  };
}

function wyzeOk(status: number, data: Json): boolean {
  if (status === 429) return false;
  if (status < 200 || status >= 300) return false;
  const code = data.code;
  if (code === undefined || code === null) return true;
  return code === 1 || code === "1" || code === 200 || code === "200";
}

async function readJson(res: Response): Promise<Json> {
  const text = await res.text();
  if (!text) return {};
  try {
    return parseWyzeJson(text) as Json;
  } catch {
    return { raw: text };
  }
}

export type WyzeCreds = {
  email: string;
  password: string;
  keyId: string;
  apiKey: string;
  totpSecret?: string;
};

export type WyzeSession = {
  access_token: string;
  refresh_token: string;
  user_id: string;
  phone_id: string;
};

export async function wyzeLogin(creds: WyzeCreds, phoneId: string, now = Date.now()): Promise<WyzeSession> {
  const password = tripleMd5(creds.password);
  const nonce = nonceMs(now);
  const payload: Json = { email: creds.email.trim(), password, nonce: String(nonce) };
  const data = await authCall("/api/user/login", payload, creds, phoneId, nonce);
  const tokens = pickToken(data);
  if (tokens.access_token && tokens.refresh_token && tokens.user_id) {
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user_id: tokens.user_id,
      phone_id: phoneId,
    };
  }
  return finishMfa(data, creds, password, phoneId);
}

async function finishMfa(
  data: Json,
  creds: WyzeCreds,
  password: string,
  phoneId: string,
): Promise<WyzeSession> {
  const options = (data.mfa_options as string[]) || [];
  if (options.includes("TotpVerificationCode")) {
    if (!creds.totpSecret) {
      throw new WyzeMfaError(
        "Wyze requested authenticator MFA. Set the WYZE_TOTP_SECRET worker secret.",
      );
    }
    const details = asJson(data.mfa_details);
    const apps = (details.totp_apps as Array<{ app_id?: string }>) || [];
    const verificationId = apps[0]?.app_id;
    if (!verificationId) throw new WyzeMfaError("Wyze TOTP challenge was missing an app id.");
    const code = await totp(creds.totpSecret);
    const verified = await authCall(
      "/user/login",
      {
        email: creds.email.trim(),
        password,
        mfa_type: "TotpVerificationCode",
        verification_id: verificationId,
        verification_code: code,
      },
      creds,
      phoneId,
    );
    const tokens = pickToken(verified);
    if (!tokens.access_token || !tokens.refresh_token || !tokens.user_id) {
      throw new WyzeMfaError("Wyze TOTP verification did not return tokens.");
    }
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user_id: tokens.user_id,
      phone_id: phoneId,
    };
  }
  if (data.sms_session_id) {
    throw new WyzeMfaError(
      "Wyze requested SMS verification. Add WYZE_TOTP_SECRET (authenticator) — SMS cannot be completed in the worker.",
    );
  }
  throw new WyzeMfaError("Wyze login did not return tokens and requested an unsupported challenge.");
}

async function authCall(
  path: string,
  json: Json,
  creds: WyzeCreds,
  phoneId: string,
  nonce = nonceMs(),
): Promise<Json> {
  const headers: Record<string, string> = {
    appid: WYZE_APP_ID,
    appinfo: `wyze_android_${WYZE_APP_VERSION}`,
    phoneid: phoneId,
    "User-Agent": `wyze-sdk-2.2.0`,
    keyid: creds.keyId,
    apikey: creds.apiKey,
    "x-api-key": SDK_X_API_KEY,
    "Content-Type": "application/json;charset=utf-8",
    requestid: requestId(nonce),
  };
  const res = await fetch(`${AUTH_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(json),
  });
  const data = await readJson(res);
  if (res.status === 429) throw new WyzeRateLimitError(data);
  if (!wyzeOk(res.status, data)) {
    throw new WyzeHttpError(
      `Wyze login failed (${res.status}): ${String(data.msg ?? data.message ?? data.error ?? res.statusText)}`,
      res.status,
      data,
    );
  }
  return data;
}

export async function wyzeRefresh(session: WyzeSession, now = Date.now()): Promise<WyzeSession> {
  const ts = nonceMs(now);
  const body = {
    access_token: session.access_token,
    app_name: WYZE_APP_NAME,
    app_ver: `${WYZE_APP_NAME}___${WYZE_APP_VERSION}`,
    app_version: WYZE_APP_VERSION,
    phone_id: session.phone_id,
    phone_system_type: "2",
    sc: WYZE_SC,
    ts,
    refresh_token: session.refresh_token,
    sv: SV_REFRESH_TOKEN,
  };
  const res = await fetch(`${API_BASE}/app/user/refresh_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=utf-8",
      Connection: "keep-alive",
      "User-Agent": "okhttp/4.7.2",
      "Accept-Encoding": "gzip",
    },
    body: JSON.stringify(body),
  });
  const data = await readJson(res);
  if (res.status === 429) throw new WyzeRateLimitError(data);
  if (!wyzeOk(res.status, data)) {
    throw new WyzeHttpError(
      `Wyze refresh failed (${res.status}): ${String(data.msg ?? data.message ?? res.statusText)}`,
      res.status,
      data,
    );
  }
  const tokens = pickToken(data);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new WyzeHttpError("Wyze refresh did not return tokens", res.status, data);
  }
  return {
    ...session,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    user_id: tokens.user_id || session.user_id,
  };
}

export type WyzeDevice = { mac: string; model: string; nickname?: string };

export async function listScaleDevices(session: WyzeSession, now = Date.now()): Promise<WyzeDevice[]> {
  const ts = nonceMs(now);
  const body = {
    access_token: session.access_token,
    app_name: WYZE_APP_NAME,
    app_ver: `${WYZE_APP_NAME}___${WYZE_APP_VERSION}`,
    app_version: WYZE_APP_VERSION,
    phone_id: session.phone_id,
    phone_system_type: "2",
    sc: WYZE_SC,
    ts,
    sv: SV_GET_DEVICE_LIST,
  };
  const res = await fetch(`${API_BASE}/app/v2/home_page/get_object_list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=utf-8",
      Connection: "keep-alive",
      "User-Agent": "okhttp/4.7.2",
      "Accept-Encoding": "gzip",
    },
    body: JSON.stringify(body),
  });
  const data = await readJson(res);
  if (!wyzeOk(res.status, data)) {
    throw new WyzeHttpError(
      `Wyze device list failed (${res.status}): ${String(data.msg ?? data.message ?? res.statusText)}`,
      res.status,
      data,
    );
  }
  const list = (asJson(data.data).device_list as Array<Json>) || [];
  const SCALE_MODELS = new Set(["JA.SC", "JA.SC2", "WL_SC2", "WL_SC3", "WL_SCU", "WL_SCLET"]);
  return list
    .filter((d) => SCALE_MODELS.has(String(d.product_model ?? "")))
    .map((d) => ({
      mac: String(d.mac ?? d.device_id ?? ""),
      model: String(d.product_model ?? ""),
      nickname: d.nickname ? String(d.nickname) : undefined,
    }));
}

export async function getRecordRange(
  session: WyzeSession,
  opts: { userId: string; startMs: number; endMs: number; now?: number },
): Promise<Json[]> {
  const nonce = nonceMs(opts.now ?? Date.now());
  const params: Record<string, string | number> = {
    family_member_id: opts.userId,
    start_time: String(opts.startMs),
    end_time: String(opts.endMs),
    forward: "0",
    nonce,
  };
  const body = sortedQuery(params);
  const signature2 = generateDynamicSignature(session.access_token, body);
  const headers = plutoHeaders({
    accessToken: session.access_token,
    phoneId: session.phone_id,
    nonce,
    signature2,
  });
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])));
  const res = await fetch(`${PLUTO_BASE}/plugin/pluto/get_record_range?${qs}`, {
    method: "GET",
    headers: headers as Record<string, string>,
  });
  const data = await readJson(res);
  if (!wyzeOk(res.status, data)) {
    throw new WyzeHttpError(
      `Wyze scale history failed (${res.status}): ${String(data.msg ?? data.message ?? res.statusText)}`,
      res.status,
      data,
    );
  }
  const rows = data.data;
  return Array.isArray(rows) ? (rows as Json[]) : [];
}

export async function getHeartRateRecords(
  session: WyzeSession,
  opts: { userId: string; recordNumber?: number; now?: number },
): Promise<Json[]> {
  const nonce = nonceMs(opts.now ?? Date.now());
  const params: Record<string, string | number> = {
    family_member_id: opts.userId,
    record_number: String(opts.recordNumber ?? 50),
    nonce,
  };
  const body = sortedQuery(params);
  const signature2 = generateDynamicSignature(session.access_token, body);
  const headers = plutoHeaders({
    accessToken: session.access_token,
    phoneId: session.phone_id,
    nonce,
    signature2,
  });
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])));
  const res = await fetch(`${PLUTO_BASE}/plugin/pluto/get_heart_rate_record_list?${qs}`, {
    method: "GET",
    headers: headers as Record<string, string>,
  });
  const data = await readJson(res);
  if (!wyzeOk(res.status, data)) return [];
  const rows = data.data;
  if (Array.isArray(rows)) return rows as Json[];
  if (rows && typeof rows === "object") {
    const inner = asJson(rows);
    for (const key of ["list", "record_list", "heart_rate_list"]) {
      if (Array.isArray(inner[key])) return inner[key] as Json[];
    }
  }
  return [];
}
