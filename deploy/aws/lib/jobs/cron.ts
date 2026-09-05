/**
 * node-cron expressions to EventBridge cron expressions.
 *
 * The application's schedules are written in Unix 5-field cron because that is what
 * `node-cron` parses on every other target. EventBridge is not Unix cron and the
 * differences are silent ones — an expression that translates naively still deploys,
 * still fires, and fires at the wrong time:
 *
 *   1. **Six fields, not five.** EventBridge appends a year field.
 *   2. **Day-of-month and day-of-week are mutually exclusive.** Exactly one must be
 *      `?`; supplying `*` for both is rejected at deploy, not at synth.
 *   3. **Day-of-week is 1-based.** Unix cron numbers Sunday 0 (and 7); EventBridge
 *      numbers Sunday 1. `0 0 * * 1` is Monday in `node-cron` and **Sunday** in
 *      EventBridge — the one difference that produces a working rule with the wrong
 *      meaning, which is why this file exists rather than a template literal.
 *
 * Anything not translatable throws at **synth**. A deploy that cannot express the
 * configured schedule should fail while a human is reading output, not provision a
 * rule that fires on a day nobody asked for.
 */

import { ConfigurationError } from '../config/errors';

/** Unix day-of-week names, in the order both syntaxes list them. */
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * Shifts one day-of-week token from Unix numbering to EventBridge's.
 *
 * Names pass through: both syntaxes spell them the same. Numbers move by one, with
 * Unix's `7` folding onto Sunday as `node-cron` treats it.
 */
function translateDayToken(token: string): string {
  if (/^\d+$/.test(token)) {
    const day = Number(token);
    if (day > 7) {
      throw new ConfigurationError(
        `Day-of-week "${token}" is out of range; Unix cron allows 0-7 (0 and 7 are Sunday).`
      );
    }
    return String((day % 7) + 1);
  }

  const name = token.toUpperCase();
  if (DAY_NAMES.includes(name)) {
    return name;
  }

  throw new ConfigurationError(
    `Day-of-week "${token}" is not a number or a day name; this target cannot translate it ` +
      'to an EventBridge expression. Use 0-7, SUN-SAT, or "*".'
  );
}

/**
 * Applies `translateDayToken` across lists and ranges.
 *
 * **A step is left alone**, and that is not an omission: in a step expression the
 * number after the slash is an interval, not a day. Shifting it would turn "every
 * second day" into "every third", while the days a step selects are already identical
 * under both numbering schemes — a step of two gives Unix 0,2,4,6 and EventBridge
 * 1,3,5,7, the same four days.
 */
function translateDayOfWeek(field: string): string {
  if (field === '*' || field === '?') {
    return field;
  }

  return field
    .split(',')
    .map((part) => {
      const [base, ...steps] = part.split('/');
      const translated = (base as string)
        .split('-')
        .map((token) => (token === '*' ? token : translateDayToken(token)))
        .join('-');
      return [translated, ...steps].join('/');
    })
    .join(',');
}

/**
 * Translate a 5-field Unix cron expression into EventBridge's 6-field syntax.
 *
 * @param expression the value of a `JOBS_*_SCHEDULE` key
 * @param context what is being scheduled, so a failure names the job rather than the
 *   expression alone
 */
export function toEventBridgeCron(expression: string, context: string): string {
  const fields = expression.trim().split(/\s+/);

  if (fields.length === 6) {
    throw new ConfigurationError(
      `Schedule for ${context} has six fields ("${expression}"). A seconds field cannot be ` +
        'expressed on this target: EventBridge rules fire at most once a minute.'
    );
  }

  if (fields.length !== 5) {
    throw new ConfigurationError(
      `Schedule for ${context} must have five fields (minute hour day-of-month month ` +
        `day-of-week); received "${expression}".`
    );
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields as [
    string,
    string,
    string,
    string,
    string,
  ];

  const translatedDayOfWeek = translateDayOfWeek(dayOfWeek);

  // Exactly one of the two day fields must be `?`. Unspecified beats specified: when
  // the expression constrains day-of-week, the day-of-month wildcard is the one that
  // yields, and vice versa. Both wildcards is the common case and gives up the week.
  const [emittedDayOfMonth, emittedDayOfWeek] =
    translatedDayOfWeek === '*'
      ? [dayOfMonth, '?']
      : dayOfMonth === '*'
        ? ['?', translatedDayOfWeek]
        : (() => {
            throw new ConfigurationError(
              `Schedule for ${context} constrains both day-of-month and day-of-week ` +
                `("${expression}"). EventBridge requires one of them to be unspecified, so ` +
                'this schedule cannot be expressed on this target.'
            );
          })();

  return `cron(${minute} ${hour} ${emittedDayOfMonth} ${month} ${emittedDayOfWeek} *)`;
}
