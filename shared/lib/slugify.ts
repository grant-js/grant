import slugify from 'slugify';
import { slugifyOptions } from '../config/slugify';

export function slugifySafe(input: string) {
  return slugify(input, slugifyOptions);
}
