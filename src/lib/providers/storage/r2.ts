import "server-only";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageProvider, StorageObject } from "./types";

const UPLOAD_URL_EXPIRY_SECONDS = 15 * 60;

/**
 * S3-compatible object storage — Cloudflare R2 in production. No public
 * bucket/custom domain is configured (STORAGE_PUBLIC_BASE_URL unset), so
 * getPublicUrl falls back to our own proxy route (see
 * src/app/api/media/[...key]/route.ts) which streams the object through
 * GetObjectCommand. Swapping in a real public base URL later needs no
 * code change here — see the branch below.
 */
export class R2StorageProvider implements StorageProvider {
  private readonly client: S3Client;

  constructor(
    private readonly endpoint: string,
    accessKeyId: string,
    secretAccessKey: string,
    private readonly bucket: string,
    private readonly publicBaseUrl: string,
    private readonly appUrl: string
  ) {
    this.client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  }

  async getSignedUploadUrl(key: string, contentType: string): Promise<{ uploadUrl: string; publicUrl: string }> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: UPLOAD_URL_EXPIRY_SECONDS });
    return { uploadUrl, publicUrl: this.getPublicUrl(key) };
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async getObject(key: string, range?: string): Promise<StorageObject> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key, ...(range ? { Range: range } : {}) })
    );
    if (!result.Body) {
      throw new Error(`Object body missing for key: ${key}`);
    }
    return {
      body: await result.Body.transformToWebStream(),
      contentType: result.ContentType ?? null,
      contentLength: result.ContentLength ?? null,
      contentRange: result.ContentRange ?? null,
      status: result.ContentRange ? 206 : 200,
    };
  }

  getPublicUrl(key: string): string {
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/$/, "")}/${key}`;
    }
    return `${this.appUrl.replace(/\/$/, "")}/api/media/${key}`;
  }
}

export const storageProvider: StorageProvider = new R2StorageProvider(
  process.env.STORAGE_ENDPOINT ?? "",
  process.env.STORAGE_ACCESS_KEY_ID ?? "",
  process.env.STORAGE_SECRET_ACCESS_KEY ?? "",
  process.env.STORAGE_BUCKET ?? "",
  process.env.STORAGE_PUBLIC_BASE_URL ?? "",
  process.env.APP_URL ?? "http://localhost:3000"
);
