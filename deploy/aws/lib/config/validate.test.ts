/**
 * Every case here is a first-deploy failure someone would otherwise hit against
 * live AWS, minutes into `cdk deploy`, with a CloudFormation error naming an
 * unrelated resource. Failing at synth with an actionable sentence is the whole
 * point of the configuration surface.
 */
import { describe, expect, it } from 'vitest';

import { ConfigurationError } from './errors';
import { validateAppUrl, validateCertificateArn, validateHostnameInZone } from './validate';

describe('validateAppUrl', () => {
  it.each([
    ['https://grant.example.com', 'grant.example.com'],
    ['https://grant.example.com/', 'grant.example.com'],
    ['https://sub.domain.example.co.uk', 'sub.domain.example.co.uk'],
  ])('accepts %s', (appUrl, hostname) => {
    expect(validateAppUrl(appUrl)).toEqual({ hostname });
  });

  it.each([
    ['grant.example.com', 'absolute URL'],
    ['not a url', 'absolute URL'],
    // CloudFront terminates TLS and every cookie the platform sets is Secure.
    ['http://grant.example.com', 'https'],
    // The path space belongs to the routing table; a base path shifts every route.
    ['https://grant.example.com/app', 'no path'],
    ['https://grant.example.com/?x=1', 'no path'],
  ])('rejects %s', (appUrl, expectedMessage) => {
    expect(() => validateAppUrl(appUrl)).toThrow(ConfigurationError);
    expect(() => validateAppUrl(appUrl)).toThrow(new RegExp(expectedMessage));
  });

  it('names the offending value in the message', () => {
    // An error an adopter can act on without reading CDK source.
    expect(() => validateAppUrl('http://grant.example.com')).toThrow(
      /http:\/\/grant\.example\.com/
    );
  });
});

describe('validateCertificateArn', () => {
  const usEast1 = 'arn:aws:acm:us-east-1:123456789012:certificate/abc-123';

  it('accepts a us-east-1 certificate', () => {
    expect(() => validateCertificateArn(usEast1)).not.toThrow();
  });

  it('accepts non-aws partitions in us-east-1', () => {
    expect(() =>
      validateCertificateArn('arn:aws-us-gov:acm:us-east-1:123456789012:certificate/abc')
    ).not.toThrow();
  });

  it('rejects a certificate in any other region', () => {
    // The single most common first-deploy failure: issued in the stack's own region.
    expect(() =>
      validateCertificateArn('arn:aws:acm:eu-central-1:123456789012:certificate/abc-123')
    ).toThrow(/requires a certificate in us-east-1.*eu-central-1/s);
  });

  it('explains that the region requirement is independent of the stack region', () => {
    expect(() =>
      validateCertificateArn('arn:aws:acm:eu-west-1:123456789012:certificate/abc')
    ).toThrow(/whatever region the stack targets/);
  });

  it.each([['not-an-arn'], ['arn:aws:iam::123456789012:role/thing'], ['arn:aws:acm:us-east-1']])(
    'rejects %s as not an ACM certificate ARN',
    (arn) => {
      expect(() => validateCertificateArn(arn)).toThrow(ConfigurationError);
    }
  );
});

describe('validateHostnameInZone', () => {
  it.each([
    ['grant.example.com', 'example.com'],
    ['grant.example.com', 'example.com.'],
    ['example.com', 'example.com'],
    ['a.b.example.com', 'example.com'],
  ])('accepts %s in %s', (hostname, zone) => {
    expect(() => validateHostnameInZone(hostname, zone)).not.toThrow();
  });

  it.each([
    ['grant.other.com', 'example.com'],
    // Suffix match must respect the label boundary, or notexample.com passes.
    ['grant.notexample.com', 'example.com'],
    ['example.com.evil.com', 'example.com'],
  ])('rejects %s in %s', (hostname, zone) => {
    expect(() => validateHostnameInZone(hostname, zone)).toThrow(ConfigurationError);
  });
});
