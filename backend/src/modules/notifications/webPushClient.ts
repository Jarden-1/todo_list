import {
  createCipheriv,
  createECDH,
  createHmac,
  createPrivateKey,
  randomBytes,
  sign
} from "node:crypto";

import { ApiError } from "../../common/apiError";
import { config } from "../../config";

const AES_128_GCM_RECORD_SIZE = 4096;
const MAX_WEB_PUSH_PLAINTEXT_BYTES = 3993;
type AnyBuffer = Buffer<ArrayBufferLike>;

export interface WebPushSubscriptionLike {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface WebPushPayload {
  notificationId: string;
  todoId: string;
  reminderId: string;
  title: string;
  body: string;
  url: string;
}

export interface SendWebPushOptions {
  ttlSeconds?: number;
}

export interface SendWebPushResult {
  statusCode: number;
}

export class WebPushSendError extends Error {
  public readonly statusCode?: number;
  public readonly responseBody?: string;

  constructor(message: string, statusCode?: number, responseBody?: string) {
    super(message);
    this.name = "WebPushSendError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }

  get subscriptionGone(): boolean {
    return this.statusCode === 404 || this.statusCode === 410;
  }
}

function base64UrlDecode(value: string): AnyBuffer {
  return Buffer.from(value, "base64url");
}

function base64UrlEncode(value: AnyBuffer | string): string {
  return Buffer.from(value).toString("base64url");
}

function hmacSha256(key: AnyBuffer, value: AnyBuffer): AnyBuffer {
  return createHmac("sha256", key).update(value).digest();
}

function hkdfExpand(prk: AnyBuffer, info: AnyBuffer, length: number): AnyBuffer {
  const blocks: AnyBuffer[] = [];
  let previous: AnyBuffer = Buffer.alloc(0);
  let blockIndex = 1;

  while (Buffer.concat(blocks).length < length) {
    previous = hmacSha256(
      prk,
      Buffer.concat([previous, info, Buffer.from([blockIndex])])
    );
    blocks.push(previous);
    blockIndex += 1;
  }

  return Buffer.concat(blocks).subarray(0, length);
}

function validatePublicKey(publicKey: AnyBuffer, name: string): void {
  if (publicKey.length !== 65 || publicKey[0] !== 0x04) {
    throw new ApiError(
      "VALIDATION_ERROR",
      `${name} 必须是未压缩的 P-256 public key`,
      400,
      { name }
    );
  }
}

function encodeRecordSize(value: number): AnyBuffer {
  const output = Buffer.alloc(4);
  output.writeUInt32BE(value, 0);
  return output;
}

function createVapidJwt(endpoint: string): string {
  const publicKey = config.WEB_PUSH_VAPID_PUBLIC_KEY.trim();
  const privateKey = config.WEB_PUSH_VAPID_PRIVATE_KEY.trim();

  if (!publicKey || !privateKey) {
    throw new ApiError(
      "BUSINESS_ERROR",
      "Web Push VAPID key 未配置",
      422,
      { missing: ["WEB_PUSH_VAPID_PUBLIC_KEY", "WEB_PUSH_VAPID_PRIVATE_KEY"] }
    );
  }

  const publicKeyBytes = base64UrlDecode(publicKey);
  const privateKeyBytes = base64UrlDecode(privateKey);

  validatePublicKey(publicKeyBytes, "WEB_PUSH_VAPID_PUBLIC_KEY");

  if (privateKeyBytes.length !== 32) {
    throw new ApiError(
      "BUSINESS_ERROR",
      "WEB_PUSH_VAPID_PRIVATE_KEY 格式不正确",
      422
    );
  }

  const jwtHeader = base64UrlEncode(
    JSON.stringify({ typ: "JWT", alg: "ES256" })
  );
  const jwtBody = base64UrlEncode(
    JSON.stringify({
      aud: new URL(endpoint).origin,
      exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
      sub: config.WEB_PUSH_SUBJECT
    })
  );
  const unsignedToken = `${jwtHeader}.${jwtBody}`;
  const privateJwk = {
    kty: "EC",
    crv: "P-256",
    x: base64UrlEncode(publicKeyBytes.subarray(1, 33)),
    y: base64UrlEncode(publicKeyBytes.subarray(33, 65)),
    d: base64UrlEncode(privateKeyBytes)
  };
  const keyObject = createPrivateKey({
    key: privateJwk,
    format: "jwk"
  });
  const signature = sign("sha256", Buffer.from(unsignedToken), {
    key: keyObject,
    dsaEncoding: "ieee-p1363"
  });

  return `${unsignedToken}.${base64UrlEncode(signature)}`;
}

function encryptPayload(
  subscription: WebPushSubscriptionLike,
  payload: WebPushPayload
): AnyBuffer {
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");

  if (plaintext.length > MAX_WEB_PUSH_PLAINTEXT_BYTES) {
    throw new ApiError(
      "BUSINESS_ERROR",
      "Web Push payload 过大",
      422,
      { maxBytes: MAX_WEB_PUSH_PLAINTEXT_BYTES }
    );
  }

  const receiverPublicKey = base64UrlDecode(subscription.p256dh);
  const receiverAuthSecret = base64UrlDecode(subscription.auth);
  validatePublicKey(receiverPublicKey, "subscription.keys.p256dh");

  const localEcdh = createECDH("prime256v1");
  localEcdh.generateKeys();
  const localPublicKey = localEcdh.getPublicKey();
  const sharedSecret = localEcdh.computeSecret(receiverPublicKey);
  const salt = randomBytes(16);

  const keyInfo = Buffer.concat([
    Buffer.from("WebPush: info", "ascii"),
    Buffer.from([0x00]),
    receiverPublicKey,
    localPublicKey
  ]);
  const prkKey = hmacSha256(receiverAuthSecret, sharedSecret);
  const ikm = hkdfExpand(prkKey, keyInfo, 32);
  const prk = hmacSha256(salt, ikm);
  const cek = hkdfExpand(
    prk,
    Buffer.concat([
      Buffer.from("Content-Encoding: aes128gcm", "ascii"),
      Buffer.from([0x00])
    ]),
    16
  );
  const nonce = hkdfExpand(
    prk,
    Buffer.concat([
      Buffer.from("Content-Encoding: nonce", "ascii"),
      Buffer.from([0x00])
    ]),
    12
  );
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const paddedPlaintext = Buffer.concat([plaintext, Buffer.from([0x02])]);
  const encrypted = Buffer.concat([
    cipher.update(paddedPlaintext),
    cipher.final(),
    cipher.getAuthTag()
  ]);

  return Buffer.concat([
    salt,
    encodeRecordSize(AES_128_GCM_RECORD_SIZE),
    Buffer.from([localPublicKey.length]),
    localPublicKey,
    encrypted
  ]);
}

export function getVapidPublicKey(): string {
  const publicKey = config.WEB_PUSH_VAPID_PUBLIC_KEY.trim();

  if (!publicKey) {
    throw new ApiError("BUSINESS_ERROR", "Web Push VAPID public key 未配置", 422);
  }

  return publicKey;
}

export async function sendWebPush(
  subscription: WebPushSubscriptionLike,
  payload: WebPushPayload,
  options: SendWebPushOptions = {}
): Promise<SendWebPushResult> {
  const body = encryptPayload(subscription, payload);
  const jwt = createVapidJwt(subscription.endpoint);
  const publicKey = config.WEB_PUSH_VAPID_PUBLIC_KEY.trim();
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      TTL: String(options.ttlSeconds ?? 3600),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      Authorization: `vapid t=${jwt}, k=${publicKey}`
    },
    body
  });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    throw new WebPushSendError(
      `Web Push failed with HTTP ${response.status}`,
      response.status,
      responseBody.slice(0, 1000)
    );
  }

  return { statusCode: response.status };
}
