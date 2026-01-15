/**
 * ReshADX - Webhook URL Validator Middleware
 * Prevents SSRF attacks by validating webhook URLs
 */

import { Request, Response, NextFunction } from 'express';
import { URL } from 'url';
import dns from 'dns';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const dnsLookup = promisify(dns.lookup);

/**
 * Blocked IP ranges (private, localhost, metadata)
 */
const BLOCKED_IP_RANGES = [
  // Localhost
  /^127\./,
  /^0\./,
  // Private networks
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  // Link-local
  /^169\.254\./,
  // Cloud metadata endpoints
  /^169\.254\.169\.254$/,
  /^fd00:/,
  // IPv6 localhost
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

/**
 * Blocked hostnames
 */
const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  // AWS metadata
  '169.254.169.254',
  'metadata.google.internal',
  'metadata.goog',
  // Common internal hostnames
  'internal',
  'local',
  'kubernetes',
  'kubernetes.default',
  'kubernetes.default.svc',
];

/**
 * Allowed URL schemes
 */
const ALLOWED_SCHEMES = ['https'];

/**
 * Optional: Allowed domains (empty = all external domains allowed)
 */
const ALLOWED_DOMAINS: string[] = [
  // Add customer domains here if you want to whitelist
  // '*.example.com',
];

/**
 * Check if IP address is in blocked range
 */
const isBlockedIP = (ip: string): boolean => {
  return BLOCKED_IP_RANGES.some(pattern => pattern.test(ip));
};

/**
 * Check if hostname is blocked
 */
const isBlockedHostname = (hostname: string): boolean => {
  const lowerHostname = hostname.toLowerCase();
  return BLOCKED_HOSTNAMES.some(blocked =>
    lowerHostname === blocked ||
    lowerHostname.endsWith('.' + blocked)
  );
};

/**
 * Check if domain matches allowed pattern
 */
const matchesDomainPattern = (hostname: string, pattern: string): boolean => {
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(2);
    return hostname.endsWith('.' + suffix) || hostname === suffix;
  }
  return hostname === pattern;
};

/**
 * Validate webhook URL for security
 */
export const validateWebhookUrl = async (url: string): Promise<{
  valid: boolean;
  error?: string;
}> => {
  try {
    // Parse URL
    const parsedUrl = new URL(url);

    // Check scheme
    if (!ALLOWED_SCHEMES.includes(parsedUrl.protocol.replace(':', ''))) {
      return {
        valid: false,
        error: `Invalid URL scheme. Only ${ALLOWED_SCHEMES.join(', ')} allowed`,
      };
    }

    // Check for blocked hostnames
    if (isBlockedHostname(parsedUrl.hostname)) {
      return {
        valid: false,
        error: 'This hostname is not allowed for webhooks',
      };
    }

    // Check if hostname is an IP address
    const ipv4Pattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    const ipv6Pattern = /^\[?[a-fA-F0-9:]+\]?$/;

    if (ipv4Pattern.test(parsedUrl.hostname) || ipv6Pattern.test(parsedUrl.hostname)) {
      if (isBlockedIP(parsedUrl.hostname)) {
        return {
          valid: false,
          error: 'Direct IP addresses in private ranges are not allowed',
        };
      }
    }

    // Resolve hostname and check IP
    try {
      const { address } = await dnsLookup(parsedUrl.hostname);
      if (isBlockedIP(address)) {
        return {
          valid: false,
          error: 'This hostname resolves to a blocked IP range',
        };
      }
    } catch (dnsError) {
      return {
        valid: false,
        error: 'Unable to resolve hostname',
      };
    }

    // Check against allowed domains (if configured)
    if (ALLOWED_DOMAINS.length > 0) {
      const isAllowed = ALLOWED_DOMAINS.some(pattern =>
        matchesDomainPattern(parsedUrl.hostname, pattern)
      );
      if (!isAllowed) {
        return {
          valid: false,
          error: 'This domain is not in the allowed list',
        };
      }
    }

    // Check for credentials in URL (not allowed)
    if (parsedUrl.username || parsedUrl.password) {
      return {
        valid: false,
        error: 'URLs with embedded credentials are not allowed',
      };
    }

    // Check port
    const port = parsedUrl.port ? parseInt(parsedUrl.port) : 443;
    const allowedPorts = [80, 443, 8080, 8443];
    if (!allowedPorts.includes(port)) {
      return {
        valid: false,
        error: `Port ${port} is not allowed. Allowed ports: ${allowedPorts.join(', ')}`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid URL format',
    };
  }
};

/**
 * Middleware to validate webhook URL in request body
 */
export const webhookUrlValidator = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  const url = req.body?.url;

  if (!url) {
    return next();
  }

  const validation = await validateWebhookUrl(url);

  if (!validation.valid) {
    logger.warn('Webhook URL validation failed', {
      url: url.substring(0, 50) + '...',
      error: validation.error,
      userId: req.user?.userId,
      ip: req.ip,
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_WEBHOOK_URL',
        message: validation.error,
      },
      request_id: res.getHeader('X-Request-ID'),
    });
  }

  next();
};

export default webhookUrlValidator;
