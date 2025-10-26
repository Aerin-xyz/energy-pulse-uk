// Shared security utilities for rate limiting, caching, and input validation

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
}

export interface CacheConfig {
  ttlSeconds: number;
  keyPrefix: string;
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

// Database-based rate limiting
export async function checkRateLimit(
  functionName: string,
  clientIP: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; headers: Record<string, string> }> {
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date();
    
    // Calculate window starts
    const minuteWindowStart = new Date(now.getTime() - (now.getSeconds() * 1000) - (now.getMilliseconds()));
    const hourWindowStart = new Date(now);
    hourWindowStart.setMinutes(0, 0, 0);

    // Check/increment minute window
    const { data: minuteData, error: minuteError } = await supabase.rpc('increment_rate_limit', {
      p_function_name: functionName,
      p_client_ip: clientIP,
      p_window_type: 'minute',
      p_window_start: minuteWindowStart.toISOString()
    });

    // Check/increment hour window
    const { data: hourData, error: hourError } = await supabase.rpc('increment_rate_limit', {
      p_function_name: functionName,
      p_client_ip: clientIP,
      p_window_type: 'hour',
      p_window_start: hourWindowStart.toISOString()
    });

    if (minuteError || hourError) {
      console.error('[RateLimit] Database error:', { minuteError, hourError });
      // Fail open - allow request if rate limiting has errors
      return { allowed: true, headers: {} };
    }

    const minuteCount = minuteData || 0;
    const hourCount = hourData || 0;

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
    console.error('[RateLimit] Unexpected error:', error);
    return { allowed: true, headers: {} };
  }
}


// Database-only caching
export async function getCachedResponse(
  cacheKey: string
): Promise<{ hit: boolean; data: string | null; ttl: number }> {
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data, error } = await supabase
      .from('api_cache')
      .select('data, expires_at')
      .eq('cache_key', cacheKey)
      .maybeSingle();
    
    if (!error && data) {
      const now = new Date();
      const expiresAt = new Date(data.expires_at);
      
      if (expiresAt > now) {
        const ttl = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
        console.log('[DB Cache] HIT:', cacheKey, 'TTL:', ttl);
        return { hit: true, data: JSON.stringify(data.data), ttl };
      } else {
        console.log('[DB Cache] EXPIRED:', cacheKey);
        // Delete expired entry
        await supabase.from('api_cache').delete().eq('cache_key', cacheKey);
      }
    }
  } catch (err) {
    console.error('[DB Cache] Error:', err);
  }
  
  console.log('[Cache] MISS:', cacheKey);
  return { hit: false, data: null, ttl: 0 };
}

export async function setCachedResponse(
  cacheKey: string,
  data: string,
  ttlSeconds: number
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error } = await supabase
      .from('api_cache')
      .upsert({
        cache_key: cacheKey,
        data: JSON.parse(data),
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'cache_key'
      });
    
    if (error) {
      console.error('[DB Cache] Write error:', error);
    } else {
      console.log('[DB Cache] SET:', cacheKey, 'expires:', expiresAt.toISOString());
    }
  } catch (err) {
    console.error('[DB Cache] Error:', err);
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
