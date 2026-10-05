import { adapterFor, type PagesContext } from './_adapter';

export const onRequest = ({ request, env }: PagesContext) =>
  adapterFor(env).explain(request, request.headers.get('CF-Connecting-IP') ?? undefined);
