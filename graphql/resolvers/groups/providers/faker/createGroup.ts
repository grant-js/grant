import { CreateGroupParams, CreateGroupResult } from '../types';
import { createGroup as createGroupInStore } from './dataStore';

export async function createGroup({ input }: CreateGroupParams): Promise<CreateGroupResult> {
  return createGroupInStore(input);
}
