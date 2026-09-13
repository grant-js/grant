/**
 * The alert on the origin-verify refusal log.
 *
 * Phase C's slice 4 security review sustained "the Function URL is publicly reachable"
 * **with an alert on this log line as the named compensating control**. It was never
 * built, which made it an accepted risk whose control did not exist — the reason part A
 * of this story comes first.
 *
 * The exposure it watches: Origin Access Control cannot carry this API's traffic (see
 * `ApiFunction`'s note at the Function URL), so the URL answers the internet and
 * `originVerifyMiddleware` in `apps/api` is what turns a direct caller away. Nothing
 * observed that happening. A refusal is not, on its own, an incident — a public URL is
 * scanned, continuously, by everyone — so this alarms on a *rate* rather than on an
 * occurrence.
 *
 * The first observability construct in this target: `grep -rn 'Alarm\|MetricFilter'
 * deploy/aws/lib` returned nothing before it.
 */

import { Duration } from 'aws-cdk-lib';
import {
  Alarm,
  ComparisonOperator,
  type IAlarmAction,
  Metric,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { FilterPattern, type ILogGroup, MetricFilter } from 'aws-cdk-lib/aws-logs';
import type { ITopic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

/** Namespaced away from `AWS/*`, which is reserved for service-published metrics. */
export const ORIGIN_VERIFY_METRIC_NAMESPACE = 'Grant/Edge';

export const ORIGIN_VERIFY_METRIC_NAME = 'DirectOriginRequests';

/**
 * How many refusals in one period constitute an attack rather than the internet.
 *
 * **A starting point, and deliberately a loose one.** Nothing has measured how many
 * unsolicited requests a Grant Function URL receives, so this is the wrong number by an
 * unknown factor in a known direction: too tight and the control is muted by its own
 * false positives, which is exactly how a paper control dies quietly. Slice 4 measures
 * the baseline over a live deploy window and corrects this default with a number.
 *
 * 20 in five minutes is four a minute — well above idle scanner traffic against a
 * hostname that appears in no certificate transparency log until it is deployed, and
 * well below any rate that would matter. It is *not* calibrated against a real
 * observation, and this comment is the record of that.
 */
const DEFAULT_THRESHOLD = 20;

/**
 * Two periods, not one.
 *
 * A single burst is a scanner finding the host; the same rate sustained across ten
 * minutes is someone working at it. Requiring two consecutive breaching periods costs
 * five minutes of detection latency and removes the largest category of false positive
 * — which matters more for a control whose only job is to be believed when it fires.
 */
const DEFAULT_EVALUATION_PERIODS = 2;

export interface OriginVerifyAlarmProps {
  /**
   * The API function's log group. Stack-owned (`ApiFunction.logGroup`), so nothing is
   * imported or looked up.
   */
  readonly logGroup: ILogGroup;

  /**
   * Where a breach is sent. Omit and the alarm is still created and still evaluates —
   * it just notifies nobody.
   *
   * That is the deliberate default rather than a gap. An alarm with no action is a
   * queryable control with a history: `describe-alarms` says whether it is in `ALARM`,
   * and the metric it reads is retained either way. The alternative — creating the
   * alarm only when a topic exists — makes the common deployment observe nothing at
   * all, which is the state this construct was written to end. ADR 0005 keeps the
   * topic in `bin/`: `lib/` composing an SNS topic and a subscription would put a
   * mailbox in a construct library.
   */
  readonly alarmTopic?: ITopic;

  /** See `DEFAULT_THRESHOLD`. Refusals per period. */
  readonly threshold?: number;

  /** See `DEFAULT_EVALUATION_PERIODS`. */
  readonly evaluationPeriods?: number;

  /** Length of one evaluation period. Defaults to five minutes. */
  readonly period?: Duration;
}

export class OriginVerifyAlarm extends Construct {
  public readonly metricFilter: MetricFilter;
  public readonly alarm: Alarm;

  constructor(scope: Construct, id: string, props: OriginVerifyAlarmProps) {
    super(scope, id);

    this.metricFilter = new MetricFilter(this, 'Filter', {
      logGroup: props.logGroup,
      metricNamespace: ORIGIN_VERIFY_METRIC_NAMESPACE,
      metricName: ORIGIN_VERIFY_METRIC_NAME,
      metricValue: '1',
      // Absent means zero refusals, not "no data". Without this the metric is sparse
      // and the alarm spends its life in INSUFFICIENT_DATA, which is the failure mode
      // `TreatMissingData` below is also set for.
      defaultValue: 0,
      /**
       * **Structure, not prose.** The two terms are the Pino field/value pairs
       * `createLogger('OriginVerify')` and `log.warn` produce
       * (`origin-verify.middleware.ts:60,96`), never the English of `msg` — a filter
       * that breaks when someone improves a log message is a control that silently
       * stops working, which is the exact failure this construct exists to prevent.
       * `apps/api`'s `origin-verify.middleware.test.ts` asserts both fields from the
       * side that moves.
       *
       * A **text** pattern rather than a JSON one (`{ $.module = "OriginVerify" }`),
       * and the reason is Lambda rather than taste: a JSON pattern requires the log
       * event to parse as JSON end to end, and whether the runtime forwards this
       * container's stdout verbatim or prefixes it is not something synth can know.
       * Substring terms match either way. Slice 4 confirms the filter increments
       * against a real deploy — until it does, this is unobserved.
       */
      filterPattern: FilterPattern.allTerms('"module":"OriginVerify"', '"level":"warn"'),
    });

    const period = props.period ?? Duration.minutes(5);

    this.alarm = new Alarm(this, 'Alarm', {
      metric: new Metric({
        namespace: ORIGIN_VERIFY_METRIC_NAMESPACE,
        metricName: ORIGIN_VERIFY_METRIC_NAME,
        statistic: 'Sum',
        period,
      }),
      threshold: props.threshold ?? DEFAULT_THRESHOLD,
      evaluationPeriods: props.evaluationPeriods ?? DEFAULT_EVALUATION_PERIODS,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      // With `defaultValue: 0` above, a quiet period publishes zeros rather than
      // nothing — but a log group with no events at all publishes neither, and an
      // alarm parked in INSUFFICIENT_DATA is indistinguishable from a broken one.
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmDescription:
        "Requests reached the API Function URL without CloudFront's origin-verify secret. " +
        'The URL is publicly reachable by design — Origin Access Control cannot carry this ' +
        'API — so this is the compensating control for that accepted risk. A sustained rate ' +
        'means someone is working the origin directly.',
    });

    if (props.alarmTopic) {
      this.alarm.addAlarmAction(new SnsAction(props.alarmTopic) as IAlarmAction);
    }
  }
}
