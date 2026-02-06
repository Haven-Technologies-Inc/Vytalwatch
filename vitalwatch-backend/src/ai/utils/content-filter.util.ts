import { BadRequestException, Logger } from '@nestjs/common';

export interface ContentFilterResult {
  safe: boolean;
  flags: string[];
  containsPHI: boolean;
  sanitizedContent?: string;
}

export class ContentFilterUtil {
  private static readonly logger = new Logger(ContentFilterUtil.name);

  // Prompt injection patterns
  private static readonly PROMPT_INJECTION_PATTERNS = [
    /ignore\s+previous\s+instructions/i,
    /disregard\s+all\s+prior/i,
    /forget\s+everything/i,
    /you\s+are\s+now/i,
    /new\s+instructions/i,
    /system\s*:\s*you\s+are/i,
    /override\s+your\s+programming/i,
    /act\s+as\s+if/i,
    /pretend\s+you\s+are/i,
    /jailbreak/i,
    /DAN\s+mode/i,
  ];

  // PHI (Protected Health Information) patterns
  private static readonly PHI_PATTERNS = {
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    phone: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    mrn: /\b(MRN|Medical\s+Record\s+Number)\s*:?\s*\d+/gi,
    dob: /\b(DOB|Date\s+of\s+Birth)\s*:?\s*\d{1,2}\/\d{1,2}\/\d{2,4}/gi,
    address: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir)\b/gi,
  };

  // Inappropriate content patterns
  private static readonly INAPPROPRIATE_PATTERNS = [
    /\b(profanity|offensive|harmful)\b/i,
    // Add more patterns as needed
  ];

  /**
   * Check content for safety issues
   */
  static checkContent(content: string): ContentFilterResult {
    const flags: string[] = [];
    let safe = true;
    let containsPHI = false;

    // Check for prompt injection
    for (const pattern of this.PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(content)) {
        flags.push('prompt_injection');
        safe = false;
        this.logger.warn('Potential prompt injection detected');
        break;
      }
    }

    // Check for PHI
    const phiMatches = this.detectPHI(content);
    if (phiMatches.length > 0) {
      flags.push('contains_phi');
      containsPHI = true;
      this.logger.warn(`PHI detected: ${phiMatches.join(', ')}`);
    }

    // Check for inappropriate content
    for (const pattern of this.INAPPROPRIATE_PATTERNS) {
      if (pattern.test(content)) {
        flags.push('inappropriate_content');
        safe = false;
        this.logger.warn('Inappropriate content detected');
        break;
      }
    }

    return {
      safe,
      flags,
      containsPHI,
      sanitizedContent: containsPHI ? this.sanitizePHI(content) : content,
    };
  }

  /**
   * Detect PHI in content
   */
  static detectPHI(content: string): string[] {
    const detected: string[] = [];

    for (const [type, pattern] of Object.entries(this.PHI_PATTERNS)) {
      if (pattern.test(content)) {
        detected.push(type);
      }
    }

    return detected;
  }

  /**
   * Sanitize PHI from content
   */
  static sanitizePHI(content: string): string {
    let sanitized = content;

    // Replace SSN
    sanitized = sanitized.replace(this.PHI_PATTERNS.ssn, '***-**-****');

    // Replace phone numbers
    sanitized = sanitized.replace(this.PHI_PATTERNS.phone, '***-***-****');

    // Replace emails
    sanitized = sanitized.replace(this.PHI_PATTERNS.email, '[EMAIL REDACTED]');

    // Replace MRN
    sanitized = sanitized.replace(this.PHI_PATTERNS.mrn, '[MRN REDACTED]');

    // Replace DOB
    sanitized = sanitized.replace(this.PHI_PATTERNS.dob, '[DOB REDACTED]');

    // Replace addresses
    sanitized = sanitized.replace(this.PHI_PATTERNS.address, '[ADDRESS REDACTED]');

    return sanitized;
  }

  /**
   * Validate content and throw error if unsafe
   */
  static validateContent(content: string, allowPHI: boolean = false): void {
    const result = this.checkContent(content);

    if (!result.safe && result.flags.includes('prompt_injection')) {
      throw new BadRequestException(
        'Content contains potentially unsafe patterns (prompt injection)',
      );
    }

    if (!result.safe && result.flags.includes('inappropriate_content')) {
      throw new BadRequestException(
        'Content contains inappropriate material',
      );
    }

    if (!allowPHI && result.containsPHI) {
      this.logger.warn('Content contains PHI but is being allowed');
      // Don't throw error, just warn - PHI may be necessary in medical context
    }
  }

  /**
   * Check if content is HIPAA compliant
   */
  static isHIPAACompliant(content: string, metadata: {
    encrypted?: boolean;
    auditLogged?: boolean;
    accessControlled?: boolean;
  }): boolean {
    const hasRequiredSafeguards =
      metadata.encrypted === true &&
      metadata.auditLogged === true &&
      metadata.accessControlled === true;

    const phiDetected = this.detectPHI(content).length > 0;

    // If PHI is detected, require all safeguards
    if (phiDetected && !hasRequiredSafeguards) {
      return false;
    }

    return true;
  }
}
