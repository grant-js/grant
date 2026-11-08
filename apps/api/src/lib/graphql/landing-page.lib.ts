import type { ApolloServerPlugin, BaseContext } from '@apollo/server';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';

/**
 * The landing page a browser gets on `GET /graphql`, from `APOLLO_PLAYGROUND`.
 *
 * On: the embedded Apollo Sandbox. Off: no landing page at all. Off has to be said
 * explicitly. Given no landing-page plugin, Apollo Server installs its own default,
 * which is the embedded Sandbox whenever `NODE_ENV` is not `production`, so leaving the
 * plugin out kept serving a Sandbox page (blank, because the CSP only allows Apollo's
 * CDN while the playground is on) after the web app had hidden the link to it.
 */
export function createGraphqlLandingPagePlugin<TContext extends BaseContext>(
  playground: boolean
): ApolloServerPlugin<TContext> {
  return playground
    ? ApolloServerPluginLandingPageLocalDefault({ embed: true })
    : ApolloServerPluginLandingPageDisabled();
}
