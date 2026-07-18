/**
 * S3-compatible storage driver (AWS S3 / Cloudflare R2 / MinIO).
 * Hỗ trợ presigned upload (client PUT thẳng) + presigned download.
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import type { Readable } from "node:stream"
import type { PutObjectInput, StorageProvider, UploadUrl } from "./storage"

export interface S3Config {
  bucket: string
  region: string
  endpoint?: string
  accessKeyId: string
  secretAccessKey: string
  /** MinIO / một số R2 setup cần path-style. */
  forcePathStyle?: boolean
}

export class S3StorageProvider implements StorageProvider {
  readonly driver = "s3" as const
  private readonly client: S3Client
  private readonly bucket: string

  constructor(config: S3Config) {
    this.bucket = config.bucket
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle ?? Boolean(config.endpoint),
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  }

  async putObject(input: PutObjectInput): Promise<{ key: string }> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        ContentLength: input.contentLength,
      }),
    )
    return { key: input.key }
  }

  async getObjectStream(key: string): Promise<Readable> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    )
    if (!res.Body) throw new Error(`Object không tồn tại: ${key}`)
    return res.Body as Readable
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }))
      return true
    } catch {
      return false
    }
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }

  async createUploadUrl(input: {
    key: string
    contentType: string
    maxSizeBytes: number
  }): Promise<UploadUrl> {
    const expiresInSeconds = 900
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      ContentType: input.contentType,
    })
    const url = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds })
    return {
      url,
      method: "PUT",
      headers: { "Content-Type": input.contentType },
      key: input.key,
      expiresInSeconds,
    }
  }

  async createDownloadUrl(key: string, expiresInSeconds = 900): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key })
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds })
  }
}
