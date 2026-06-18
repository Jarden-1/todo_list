import { ApiError } from "../../common/apiError";

export interface ParsedMultipartFile {
  fieldName: string;
  originalName: string;
  mimeType: string | null;
  data: Buffer;
}

export interface ParsedMultipartForm {
  fields: Record<string, string>;
  file: ParsedMultipartFile | null;
}

const CRLF = Buffer.from("\r\n");
const HEADER_SEPARATOR = Buffer.from("\r\n\r\n");

function parseBoundary(contentType: string | undefined): string {
  const boundary = contentType?.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[1]
    ?? contentType?.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[2];

  if (!boundary) {
    throw new ApiError("VALIDATION_ERROR", "缺少 multipart boundary", 400);
  }

  return boundary;
}

function parseHeaders(rawHeaders: string): Record<string, string> {
  const headers: Record<string, string> = {};

  for (const line of rawHeaders.split("\r\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }

    const name = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();
    headers[name] = value;
  }

  return headers;
}

function parseContentDisposition(
  contentDisposition: string | undefined
): Record<string, string> {
  if (!contentDisposition) {
    return {};
  }

  const params: Record<string, string> = {};
  const matches = contentDisposition.matchAll(/;\s*([A-Za-z0-9_-]+)="([^"]*)"/g);

  for (const match of matches) {
    const key = match[1];
    const value = match[2];

    if (key && value !== undefined) {
      params[key] = value;
    }
  }

  return params;
}

function sanitizeOriginalName(originalName: string): string {
  const baseName = originalName
    .replace(/\0/g, "")
    .replace(/^.*[\\/]/, "")
    .trim();

  return baseName.length > 0 ? baseName.slice(0, 255) : "file";
}

function getBodyBuffer(body: unknown): Buffer {
  if (!Buffer.isBuffer(body)) {
    throw new ApiError("VALIDATION_ERROR", "请使用 multipart/form-data 上传文件", 400);
  }

  return body;
}

export function parseMultipartFormData(input: {
  body: unknown;
  contentType: string | undefined;
}): ParsedMultipartForm {
  const body = getBodyBuffer(input.body);
  const delimiter = Buffer.from(`--${parseBoundary(input.contentType)}`);
  let cursor = body.indexOf(delimiter);

  if (cursor < 0) {
    throw new ApiError("VALIDATION_ERROR", "multipart 请求体不正确", 400);
  }

  cursor += delimiter.length;

  const fields: Record<string, string> = {};
  let file: ParsedMultipartFile | null = null;

  while (cursor < body.length) {
    if (body.subarray(cursor, cursor + 2).equals(Buffer.from("--"))) {
      break;
    }

    if (body.subarray(cursor, cursor + CRLF.length).equals(CRLF)) {
      cursor += CRLF.length;
    }

    const headerEnd = body.indexOf(HEADER_SEPARATOR, cursor);
    if (headerEnd < 0) {
      throw new ApiError("VALIDATION_ERROR", "multipart 请求体不正确", 400);
    }

    const headers = parseHeaders(body.subarray(cursor, headerEnd).toString("latin1"));
    const dispositionParams = parseContentDisposition(headers["content-disposition"]);
    const fieldName = dispositionParams.name;

    if (!fieldName) {
      throw new ApiError("VALIDATION_ERROR", "multipart 字段缺少 name", 400);
    }

    const contentStart = headerEnd + HEADER_SEPARATOR.length;
    const nextDelimiterStart = body.indexOf(
      Buffer.concat([CRLF, delimiter]),
      contentStart
    );

    if (nextDelimiterStart < 0) {
      throw new ApiError("VALIDATION_ERROR", "multipart 请求体不正确", 400);
    }

    const content = body.subarray(contentStart, nextDelimiterStart);
    const filename = dispositionParams.filename;

    if (filename !== undefined) {
      if (fieldName !== "file") {
        throw new ApiError("VALIDATION_ERROR", "文件字段名必须为 file", 400);
      }

      file = {
        fieldName,
        originalName: sanitizeOriginalName(filename),
        mimeType: headers["content-type"]?.toLowerCase() ?? null,
        data: Buffer.from(content)
      };
    } else {
      fields[fieldName] = content.toString("utf8").trim();
    }

    cursor = nextDelimiterStart + CRLF.length + delimiter.length;
  }

  return { fields, file };
}
