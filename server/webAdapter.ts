import { createExplainHandler, type ExplainEnv, type ExplainHandler } from './explainHandler';

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

// Web-standard adapter (Request/Response) for serverless and edge runtimes. It only translates; all behaviour
// lives in the shared handler.
export function createWebAdapter(env: ExplainEnv, handler: ExplainHandler = createExplainHandler(env)) {
  return {
    config: () => {
      const { status, body } = handler.config();
      return json(status, body);
    },
    async explain(request: Request, clientKey?: string) {
      const bodyText = request.method === 'POST' ? await request.text() : '';
      const { status, body } = await handler.handle({ method: request.method, bodyText, clientKey });
      return json(status, body);
    },
  };
}
