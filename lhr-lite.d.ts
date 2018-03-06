

interface LHRLite {
  initialUrl: string;        // The URL that was supplied to Lighthouse and initially navigated to.
  url: string;               // The post-redirects URL that Lighthouse loaded
  generatedTime: string;     // The ISO-8601 timestamp of when the results were generated
  audits: AuditResults;      // An object containing the results of the audits
  lighthouseVersion: string; // The version of Lighthouse with which these results were generated
}

interface AuditResults {
  [metric: string]: AuditResult  // Each AuditResult is keyed by it's `id` identifier
}

/* All audits offer a description and score of pass/fail/0-1 */
interface AuditResult {
  id: string;               // The string identifier of the audit in kebab case.
  title: string;            // The brief description of the audit. The text can change depending on if the audit passed or failed.
  description: string;      // A more detailed description that describes why the audit is important and links to Lighthouse documentation on the audit, markdown links supported.
  score: number;            // The scored value determined by the audit a number `0-1`, representing displayed scores of 0-100.
  scoreDisplayMode: string; // A string identifying how granular the score is meant to be indicating, i.e. is the audit pass/fail (scores of 0 or 1) or are there shades of gray (scores of 0-1 which map to displayed scores of 0-100).
  error: boolean;           // Set to true if there was an an exception thrown within the audit.
}

/* A few safelisted AuditResults (within Performance) will offer details */
interface DetailedAuditResult extends AuditResult {
  details: AuditDetails  // Extra information. The structure of this object can vary from audit to audit
}

interface AuditDetails {
  type: DetailsType // one of 'metric' 'opportunity' 'table'
  summary?: OpportunitySummary | MetricSummary // type of 'metric' or 'opportunity' will match the obj provided here
  headings: AuditTableHeading[]
 };

enum DetailsType {
  Metric = 'metric',
  Opportunity = 'opportunity',
  Table = 'table'
 }

interface AuditTableHeading {
  key: string           // The property key name within DetailsItem being described
  label: string         // Readable text label of the field
  itemType: string      // The type ('url', 'text', link') of the associated DetailsItems
  displayUnit?: string  // How the data should be displayed (e.g. bytes => kilobytes)
  granularity?: string  // If rounding should be applied, and to what degree
}

 interface MetricSummary {
  timing?: number        // The value of the metric expressed in milliseconds
 }

 interface OpportunitySummary {
  wastedMs: number
  wastedBytes?: number
 }

/* details.items can contain details about wasted bytes or wasted time */
interface WastedBytesDetails extends AuditDetails {
  items: WastedBytesDetailsItem[]
}

interface WastedTimeDetails extends AuditDetails {
  items: WastedTimeDetailsItem[]
}

// Including:
//   'unminified-css', 'unminified-javascript', 'uses-webp-images', 'uses-optimized-images', 'uses-request-compression',  'uses-responsive-images', 'uses-long-cache-ttl',
interface WastedBytesDetailsItem {
  url: string;
  totalBytes: number;
  wastedBytes: number;
}

// Including:
//   'time-to-first-byte', 'redirects', 'link-blocking-first-paint', 'script-blocking-first-paint',
interface WastedTimeDetailsItem {
  url: string;
  totalBytes?: number;
  wastedMs: number;
}
