// Shared security utilities for rate limiting, caching, and input validation

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
}

export interface CacheConfig {
  ttlSeconds: number;
  keyPrefix: string;
}

// Upstash Redis REST API client
class UpstashRedis {
  private url: string;
  private token: string;

  constructor() {
    this.url = Deno.env.get('UPSTASH_REDIS_REST_URL') || '';
    this.token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || '';
    
    // Log configuration status (without exposing sensitive data)
    if (this.url && this.token) {
      console.log('[Redis] Configuration loaded:', {
        urlFormat: this.url.startsWith('https://') ? 'Valid HTTPS' : 'Invalid format',
        urlHost: this.url.split('/')[2] || 'unknown',
        tokenLength: this.token.length,
        tokenPrefix: this.token.substring(0, 4) + '...'
      });
    }
  }

  private async request(command: string[]): Promise<any> {
    if (!this.url || !this.token) {
      console.error('[Redis] Configuration missing:', {
        hasUrl: !!this.url,
        hasToken: !!this.token,
        urlPreview: this.url ? `${this.url.substring(0, 20)}...` : 'missing'
      });
      throw new Error('Upstash Redis not configured - check UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN');
    }

    const requestUrl = `${this.url}/${command.join('/')}`;
    
    try {
      const response = await fetch(requestUrl, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        const responseText = await response.text();
        console.error('[Redis] Request failed:', {
          status: response.status,
          statusText: response.statusText,
          command: command.join(' '),
          url: requestUrl.replace(this.token, '***'),
          responseBody: responseText.substring(0, 500),
          headers: Object.fromEntries(response.headers.entries())
        });
        throw new Error(`Redis request failed: ${response.status} - ${responseText.substring(0, 200)}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('[Redis] Fetch error:', {
        command: command.join(' '),
        error: error instanceof Error ? error.message : String(error),
        urlPreview: this.url ? `${this.url.substring(0, 30)}...` : 'missing'
      });
      throw error;
    }
  }

  async incr(key: string): Promise<number> {
    return await this.request(['INCR', key]);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.request(['EXPIRE', key, seconds.toString()]);
  }

  async get(key: string): Promise<string | null> {
    return await this.request(['GET', key]);
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    await this.request(['SETEX', key, seconds.toString(), value]);
  }

  async ttl(key: string): Promise<number> {
    return await this.request(['TTL', key]);
  }
}

// Get client IP from request
export function getClientIP(req: Request): string {
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  const xForwardedFor = req.headers.get('x-forwarded-for');
  const xRealIP = req.headers.get('x-real-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
  if (xRealIP) return xRealIP;
  
  return 'unknown';
}

// Rate limiting middleware
export async function checkRateLimit(
  functionName: string,
  clientIP: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; headers: Record<string, string> }> {
  const redis = new UpstashRedis();
  
  try {
    // Check minute-based rate limit
    const minuteKey = `ratelimit:${functionName}:${clientIP}:min`;
    const minuteCount = await redis.incr(minuteKey);
    
    if (minuteCount === 1) {
      await redis.expire(minuteKey, 60);
    }
    
    // Check hour-based rate limit
    const hourKey = `ratelimit:${functionName}:${clientIP}:hour`;
    const hourCount = await redis.incr(hourKey);
    
    if (hourCount === 1) {
      await redis.expire(hourKey, 3600);
    }
    
    const minuteLimitExceeded = minuteCount > config.requestsPerMinute;
    const hourLimitExceeded = hourCount > config.requestsPerHour;
    
    const headers = {
      'X-RateLimit-Limit-Minute': config.requestsPerMinute.toString(),
      'X-RateLimit-Remaining-Minute': Math.max(0, config.requestsPerMinute - minuteCount).toString(),
      'X-RateLimit-Limit-Hour': config.requestsPerHour.toString(),
      'X-RateLimit-Remaining-Hour': Math.max(0, config.requestsPerHour - hourCount).toString(),
    };
    
    if (minuteLimitExceeded || hourLimitExceeded) {
      return {
        allowed: false,
        headers: {
          ...headers,
          'Retry-After': minuteLimitExceeded ? '60' : '3600',
        },
      };
    }
    
    return { allowed: true, headers };
  } catch (error) {
    // If rate limiting fails, allow the request (fail open)
    console.error('[RateLimit] Error checking rate limit:', error);
    return { allowed: true, headers: {} };
  }
}

// Compression helpers
async function compressData(data: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const input = encoder.encode(data);
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(input);
    writer.close();
    
    const chunks: Uint8Array[] = [];
    const reader = cs.readable.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const compressed = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      compressed.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Convert to base64 for storage
    const base64 = btoa(String.fromCharCode(...compressed));
    return base64;
  } catch (error) {
    console.error('[Compression] Failed to compress:', error);
    return data; // Fallback to uncompressed
  }
}

async function decompressData(compressed: string): Promise<string> {
  try {
    // Decode from base64
    const binaryString = atob(compressed);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(bytes);
    writer.close();
    
    const chunks: Uint8Array[] = [];
    const reader = ds.readable.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const decompressed = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      decompressed.set(chunk, offset);
      offset += chunk.length;
    }
    
    const decoder = new TextDecoder();
    return decoder.decode(decompressed);
  } catch (error) {
    console.error('[Decompression] Failed to decompress:', error);
    return compressed; // Fallback to treating as uncompressed
  }
}

// Response caching middleware with compression
export async function getCachedResponse(
  cacheKey: string
): Promise<{ hit: boolean; data: string | null; ttl: number }> {
  const redis = new UpstashRedis();
  
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const ttl = await redis.ttl(cacheKey);
      // Decompress the cached data
      const decompressed = await decompressData(cached);
      return { hit: true, data: decompressed, ttl };
    }
    return { hit: false, data: null, ttl: 0 };
  } catch (error) {
    console.error('[Cache] Error getting cached response:', error);
    return { hit: false, data: null, ttl: 0 };
  }
}

export async function setCachedResponse(
  cacheKey: string,
  data: string,
  ttlSeconds: number
): Promise<void> {
  const redis = new UpstashRedis();
  
  try {
    // Compress the data before caching
    const compressed = await compressData(data);
    console.log(`[Cache] Size reduction: ${data.length} -> ${compressed.length} bytes (${((1 - compressed.length / data.length) * 100).toFixed(1)}% reduction)`);
    await redis.setex(cacheKey, ttlSeconds, compressed);
  } catch (error) {
    console.error('[Cache] Error setting cached response:', error);
  }
}

// Validation helper (basic zod alternative for Deno)
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateEnum(value: any, allowedValues: string[], fieldName: string): string {
  if (value === null || value === undefined) {
    throw new ValidationError(`${fieldName} is required`);
  }
  const str = String(value);
  if (!allowedValues.includes(str)) {
    throw new ValidationError(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }
  return str;
}

export function validateOptionalEnum(value: any, allowedValues: string[], fieldName: string): string | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  return validateEnum(value, allowedValues, fieldName);
}

export function validateBoolean(value: any, fieldName: string): boolean {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  const str = String(value);
  return str === '1' || str === 'true';
}

export function validateInteger(value: any, min: number, max: number, fieldName: string): number {
  const num = Number(value);
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    throw new ValidationError(`${fieldName} must be an integer`);
  }
  if (num < min || num > max) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max}`);
  }
  return num;
}

export function validateOptionalInteger(value: any, min: number, max: number, fieldName: string): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  return validateInteger(value, min, max, fieldName);
}

export function validateString(value: any, maxLength: number, fieldName: string): string {
  if (value === null || value === undefined) {
    throw new ValidationError(`${fieldName} is required`);
  }
  const str = String(value);
  if (str.length > maxLength) {
    throw new ValidationError(`${fieldName} must be less than ${maxLength} characters`);
  }
  return str;
}

export function validateOptionalString(value: any, maxLength: number, fieldName: string): string | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  return validateString(value, maxLength, fieldName);
}

// ENTSO-E EIC domain code validator (10YXXXXXXXX-X format)
export function validateEICDomain(value: any, fieldName: string): string {
  const str = validateString(value, 20, fieldName);
  // Basic EIC format check: starts with digits/letters, contains hyphens
  if (!/^[A-Z0-9]{2}[A-Z0-9\-]{10,18}$/.test(str)) {
    throw new ValidationError(`${fieldName} must be a valid ENTSO-E EIC domain code`);
  }
  return str;
}

// ENTSO-E timestamp validator (YYYYMMDDHHMM format)
export function validateEntsoeTimestamp(value: any, fieldName: string): string {
  const str = validateString(value, 12, fieldName);
  if (!/^\d{12}$/.test(str)) {
    throw new ValidationError(`${fieldName} must be in YYYYMMDDHHMM format`);
  }
  // Validate it's a reasonable date
  const year = parseInt(str.substring(0, 4));
  const month = parseInt(str.substring(4, 6));
  const day = parseInt(str.substring(6, 8));
  const hour = parseInt(str.substring(8, 10));
  const minute = parseInt(str.substring(10, 12));
  
  if (year < 2020 || year > 2030) {
    throw new ValidationError(`${fieldName} year must be between 2020 and 2030`);
  }
  if (month < 1 || month > 12) {
    throw new ValidationError(`${fieldName} month must be between 01 and 12`);
  }
  if (day < 1 || day > 31) {
    throw new ValidationError(`${fieldName} day must be between 01 and 31`);
  }
  if (hour > 23) {
    throw new ValidationError(`${fieldName} hour must be between 00 and 23`);
  }
  if (minute > 59) {
    throw new ValidationError(`${fieldName} minute must be between 00 and 59`);
  }
  
  return str;
}

export function validateOptionalEntsoeTimestamp(value: any, fieldName: string): string | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  return validateEntsoeTimestamp(value, fieldName);
}
