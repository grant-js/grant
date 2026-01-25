import { Request } from 'express';

import { ResourceResolverRequest } from '@/lib/authorization/types';

export function extractResourceId(
  request: ResourceResolverRequest,
  key: string = 'id'
): string | null {
  if (request && typeof request === 'object') {
    const req = request as Request;
    if (req.params?.[key]) {
      const value = req.params[key];
      // Handle Express params which can be string | string[]
      return Array.isArray(value) ? value[0] : value;
    } else if (req.body?.[key]) {
      return req.body[key];
    } else {
      const args = request;
      if (args[key]) {
        return args[key];
      } else if (args.input?.[key]) {
        return args.input[key];
      }
    }
  }
  return null;
}
