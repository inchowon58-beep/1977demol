import fs from "fs/promises";
import path from "path";
import { isBlobConfigured, readBlobText, writeBlobText } from "./blob-storage";
import { isR2Configured, r2Key, readR2Text, writeR2Text } from "./r2";

export interface SeoFaq {
  question: string;
  answer: string;
}

export interface LocalPartner {
  type: string;
  name: string;
  address: string;
  placeUrl: string;
}

export interface SeoPage {
  id: string;
  slug: string;
  keyword: string;
  regionName?: string;
  title: string;
  description: string;
  content: string;
  faqs: SeoFaq[];
  localPartners?: LocalPartner[];
  /** @deprecated imageIndex 사용 — CDN 변경 시 자동 반영 */
  imageUrl?: string;
  imageIndex?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  brandName?: string;
  companyName?: string;
  tagline?: string;
  description?: string;
  url?: string;
  phone?: string;
  email?: string;
  address?: string;
  businessNumber?: string;
  representative?: string;
  imageCdn?: string;
  imageCount?: number;
  supportBase?: string;
  supportExtra?: string;
  supportMax?: string;
  geminiApiKey?: string;
  naverClientId?: string;
  naverClientSecret?: string;
  dailySeoLimit?: number;
  naverExposureId?: string;
  naverExposurePassword?: string;
  serviceAvailableDays?: number;
  serviceExpiresAt?: string;
  seoQuotaDate?: string;
  seoQuotaCount?: number;
  /** 서치어드바이저에 등록된 사이트 URL (미설정 시 config.url) */
  collectionSiteUrl?: string;
  /** VM 수집 프로그램 API 인증 토큰 */
  collectionWorkerSecret?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");

function normalizeKey(value: string): string {
  try {
    return decodeURIComponent(value).normalize("NFC").trim();
  } catch {
    return value.normalize("NFC").trim();
  }
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function readJsonFromBlobOrLocal<T>(
  filename: string,
  fallback: T
): Promise<T | null> {
  if (isBlobConfigured()) {
    const raw = await readBlobText(filename);
    if (raw) return parseJson(raw, fallback);
    const filePath = path.join(DATA_DIR, filename);
    try {
      const localRaw = await fs.readFile(filePath, "utf-8");
      return parseJson(localRaw, fallback);
    } catch {
      return null;
    }
  }

  const filePath = path.join(DATA_DIR, filename);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      return JSON.parse(raw) as T;
    } catch {
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        continue;
      }
      return null;
    }
  }
  return null;
}

async function readJson<T>(filename: string, fallback: T): Promise<T> {
  if (isR2Configured()) {
    const raw = await readR2Text(r2Key("data", filename));
    if (raw) return parseJson(raw, fallback);
    const fallbackData = await readJsonFromBlobOrLocal(filename, fallback);
    if (fallbackData !== null) return fallbackData;
    return fallback;
  }

  if (isBlobConfigured()) {
    const raw = await readBlobText(filename);
    if (raw) return parseJson(raw, fallback);
    const filePath = path.join(DATA_DIR, filename);
    try {
      const localRaw = await fs.readFile(filePath, "utf-8");
      return parseJson(localRaw, fallback);
    } catch {
      return fallback;
    }
  }

  const filePath = path.join(DATA_DIR, filename);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      return JSON.parse(raw) as T;
    } catch {
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        continue;
      }
      return fallback;
    }
  }
  return fallback;
}

export class DataStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataStorageError";
  }
}

async function writeJson<T>(filename: string, data: T): Promise<void> {
  const content = JSON.stringify(data, null, 2);

  if (isR2Configured()) {
    await writeR2Text(r2Key("data", filename), content);
    return;
  }

  if (isBlobConfigured()) {
    try {
      await writeBlobText(filename, content);
      return;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Blob 저장 중 알 수 없는 오류";
      throw new DataStorageError(message);
    }
  }

  if (process.env.VERCEL === "1") {
    throw new DataStorageError(
      "Vercel에서는 SEO 데이터 저장을 위해 Blob Storage 또는 R2 설정이 필요합니다. Vercel 대시보드 → Storage → Blob을 연결하거나 R2 환경변수를 설정하세요."
    );
  }

  const filePath = path.join(DATA_DIR, filename);
  const tempPath = `${filePath}.tmp`;
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(tempPath, content, "utf-8");
  await fs.rename(tempPath, filePath);
}

export async function getPages(): Promise<SeoPage[]> {
  return readJson<SeoPage[]>("pages.json", []);
}

export async function getPageByKey(key: string): Promise<SeoPage | undefined> {
  const pages = await getPages();
  const normalized = normalizeKey(key);

  return pages.find((p) => {
    const slugNorm = normalizeKey(p.slug);
    return (
      p.id === key ||
      p.id === normalized ||
      p.slug === key ||
      slugNorm === normalized
    );
  });
}

export async function savePage(page: SeoPage): Promise<void> {
  const pages = await getPages();
  const idx = pages.findIndex((p) => p.id === page.id);
  if (idx >= 0) pages[idx] = page;
  else pages.push(page);
  await writeJson("pages.json", pages);
}

export async function deletePage(id: string): Promise<void> {
  const pages = await getPages();
  await writeJson(
    "pages.json",
    pages.filter((p) => p.id !== id)
  );
}

export async function clearAllPages(): Promise<void> {
  await writeJson("pages.json", []);
}

export async function getSettings(): Promise<Settings> {
  return readJson<Settings>("settings.json", {});
}

export async function saveSettings(settings: Settings): Promise<void> {
  await writeJson("settings.json", settings);
}

export interface RankingCheck {
  at: string;
  rank: number | null;
}

export interface PageRankingRecord {
  pageId: string;
  keyword: string;
  slug: string;
  checks: RankingCheck[];
}

export interface RankingsData {
  updatedAt: string;
  records: PageRankingRecord[];
}

export async function getRankings(): Promise<RankingsData> {
  return readJson<RankingsData>("rankings.json", { updatedAt: "", records: [] });
}

export async function saveRankings(data: RankingsData): Promise<void> {
  await writeJson("rankings.json", data);
}

export type CollectionJobStatus = "pending" | "submitted" | "failed";

export interface CollectionJob {
  id: string;
  siteUrl: string;
  pageUrl: string;
  pageId: string;
  keyword: string;
  slug: string;
  status: CollectionJobStatus;
  requestedAt: string;
  submittedAt?: string;
  error?: string;
}

export interface CollectionQueueData {
  updatedAt: string;
  jobs: CollectionJob[];
}

export async function getCollectionQueue(): Promise<CollectionQueueData> {
  return readJson<CollectionQueueData>("collection-queue.json", {
    updatedAt: "",
    jobs: [],
  });
}

export async function saveCollectionQueue(data: CollectionQueueData): Promise<void> {
  await writeJson("collection-queue.json", data);
}

export type GenerationJobStatus = "pending" | "processing" | "completed" | "failed";

export interface GenerationJob {
  id: string;
  keyword: string;
  normalizedKeyword: string;
  status: GenerationJobStatus;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  pageId?: string;
  slug?: string;
  error?: string;
}

export interface GenerationQueueData {
  updatedAt: string;
  jobs: GenerationJob[];
}

export async function getGenerationQueue(): Promise<GenerationQueueData> {
  return readJson<GenerationQueueData>("generation-queue.json", {
    updatedAt: "",
    jobs: [],
  });
}

export async function saveGenerationQueue(data: GenerationQueueData): Promise<void> {
  await writeJson("generation-queue.json", data);
}
