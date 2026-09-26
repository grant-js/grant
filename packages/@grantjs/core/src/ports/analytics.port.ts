/**
 * Port for optional business analytics (event tracking).
 * Core defines the contract; implementations (e.g. noop, Umami) live in
 * infrastructure packages (@grantjs/analytics).
 * No PII in the port contract; adapter and deployer are responsible for compliance.
 */

export interface AnalyticsEvent {
  /** Event name. Grant's own emits use the names in `product-analytics.ts`. */
  name: string;
  /** Optional category (e.g. 'user', 'feature') */
  category?: string;
  /** Optional arbitrary properties; avoid PII */
  properties?: Record<string, unknown>;
  /** Optional user ID (opaque identifier) */
  userId?: string;
  /** Optional account ID */
  accountId?: string;
  /** Optional organization ID */
  organizationId?: string;
  /** Optional request ID for correlation */
  requestId?: string;
  /** Optional timestamp (ISO string); default is now */
  timestamp?: string;
}

export interface IAnalyticsAdapter {
  /**
   * Track an analytics event. Implementations should not throw; log and absorb errors.
   * Fire-and-forget usage is typical (same pattern as telemetry).
   */
  trackEvent(event: AnalyticsEvent): Promise<void>;
}
