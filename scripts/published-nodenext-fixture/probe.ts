import { GrantClient } from '@grantjs/client';
import type { EventData, Scope } from '@grantjs/schema';
import { GrantModule } from '@grantjs/server/nest';

declare const eventData: EventData;
declare const scope: Scope;

// Passing signal is TS2322: a real constructor/type is not assignable to `symbol`.
// If published types collapse to `any` under nodenext + skipLibCheck, these
// assignments type-check and the fixture fails (issue #731).
export const probeClient: symbol = GrantClient;
export const probeScope: symbol = scope;
export const probeEvent: symbol = eventData;
export const probeModule: symbol = GrantModule;
