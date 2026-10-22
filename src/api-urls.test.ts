/**
 * DWLF-505: every command must request /v2/<route>, never /v2/v2/<route>.
 * Real axios with a capturing adapter, so these assert the URL that would go on the wire.
 */
import axios from 'axios';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Command } from 'commander';
import { DWLFApiClient, apiRootUrl, buildApiUrl, normalizeApiPath } from './api-client';
import { createBriefingCommand } from './briefing';
import { createIntelligenceCommand } from './intelligence';
import { createRegisterCommand } from './register';
import { createRegimeCommand } from './regime';
import { createSignalsCommand } from './signals';
import { createStrategiesCommand } from './strategies';
import { createBacktestCommand } from './backtest';
import { getApiUrl } from './config';

jest.mock('./config', () => ({
  isAuthenticated: jest.fn().mockResolvedValue(true),
  getApiKey: jest.fn().mockResolvedValue('test-key'),
  getApiUrl: jest.fn(),
  loadConfig: jest.fn().mockResolvedValue({}),
  saveConfig: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('ora', () => () => {
  const spinner = { start: () => spinner, stop: () => spinner, succeed: () => spinner, fail: () => spinner, text: '' };
  return spinner;
});

const ROOT = 'https://api.dwlf.co.uk';

type Captured = { method: string; url: string; maxRedirects?: number };
let requests: Captured[];

const realCreate = axios.create.bind(axios);

beforeEach(() => {
  requests = [];
  (getApiUrl as jest.Mock).mockResolvedValue(ROOT);
  jest.spyOn(axios, 'create').mockImplementation((config) =>
    realCreate({
      ...config,
      adapter: async (req) => {
        requests.push({
          method: (req.method || 'get').toUpperCase(),
          url: axios.getUri(req),
          maxRedirects: req.maxRedirects,
        });
        return { data: {}, status: 200, statusText: 'OK', headers: {}, config: req };
      },
    })
  );
  global.fetch = jest.fn(async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({ method: init?.method || 'GET', url: String(url) });
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function run(command: Command, args: string[]): Promise<string[]> {
  await command.parseAsync(args, { from: 'user' });
  return requests.map((r) => `${r.method} ${r.url}`);
}

describe('URL helpers', () => {
  test.each([
    ['https://api.dwlf.co.uk', 'https://api.dwlf.co.uk'],
    ['https://api.dwlf.co.uk/', 'https://api.dwlf.co.uk'],
    ['https://api.dwlf.co.uk/v2', 'https://api.dwlf.co.uk'],
    ['https://api.dwlf.co.uk/v2/', 'https://api.dwlf.co.uk'],
  ])('apiRootUrl(%s) = %s', (input, expected) => {
    expect(apiRootUrl(input)).toBe(expected);
  });

  test.each([
    ['/briefing/daily', '/briefing/daily'],
    ['briefing/daily', '/briefing/daily'],
    ['/v2/briefing/daily', '/briefing/daily'],
    ['//v2/briefing/daily', '/briefing/daily'],
    ['/v2', '/'],
    ['/v2x/route', '/v2x/route'],
  ])('normalizeApiPath(%s) = %s', (input, expected) => {
    expect(normalizeApiPath(input)).toBe(expected);
  });

  test('buildApiUrl never doubles the version prefix', () => {
    expect(buildApiUrl(`${ROOT}/v2/`, '/v2/backtests')).toBe(`${ROOT}/v2/backtests`);
  });
});

describe('DWLFApiClient final URLs', () => {
  test.each([
    [ROOT, '/portfolios'],
    [`${ROOT}/`, 'portfolios'],
    [`${ROOT}/v2`, '/portfolios'],
    [ROOT, '/v2/portfolios'],
  ])('base %s + path %s → /v2/portfolios', async (baseUrl, path) => {
    const client = new DWLFApiClient({ apiKey: 'k', baseUrl, maxRetries: 0 });
    await client.get(path);
    expect(requests).toEqual([{ method: 'GET', url: `${ROOT}/v2/portfolios`, maxRedirects: 0 }]);
  });

  test('query params survive', async () => {
    const client = new DWLFApiClient({ apiKey: 'k', baseUrl: ROOT });
    await client.get('/user/trade-signals', { limit: 5, page: undefined });
    expect(requests[0]?.url).toBe(`${ROOT}/v2/user/trade-signals?limit=5`);
  });

  test('health check hits the unversioned root', async () => {
    const get = jest.spyOn(axios, 'get').mockResolvedValue({ status: 200 });
    const client = new DWLFApiClient({ baseUrl: `${ROOT}/v2` });
    await expect(client.testConnectivity()).resolves.toBe(true);
    expect(get).toHaveBeenCalledWith(`${ROOT}/health`, expect.anything());
  });
});

describe('command final URLs (DWLF-505 call sites)', () => {
  test.each<[string, () => Command, string[], string[]]>([
    ['briefing', createBriefingCommand, [], [`GET ${ROOT}/v2/briefing/daily`]],
    ['intelligence', createIntelligenceCommand, ['BTC-USD'], [`GET ${ROOT}/v2/intelligence/BTC-USD`]],
    ['register', createRegisterCommand, ['--email', 'a@b.co', '--json'], [`POST ${ROOT}/v2/agent/register`]],
    ['regime', createRegimeCommand, ['BTC-USD'], [`GET ${ROOT}/v2/regime/BTC-USD`]],
    ['regime --history', createRegimeCommand, ['BTC-USD', '--history'], [`GET ${ROOT}/v2/regime/BTC-USD/history`]],
    ['signals', createSignalsCommand, ['--limit', '5'], [`GET ${ROOT}/v2/user/trade-signals?limit=5&page=1`]],
    ['signals --id', createSignalsCommand, ['--id', 'sig1'], [`GET ${ROOT}/v2/trade-signals/sig1`]],
    ['strategies list', createStrategiesCommand, ['list'], [`GET ${ROOT}/v2/visual-strategies?limit=20`]],
    ['strategies show', createStrategiesCommand, ['show', 's1'], [`GET ${ROOT}/v2/visual-strategies/s1?includeSignals=true&signalsLimit=10`]],
    ['strategies activate', createStrategiesCommand, ['activate', 's1', 'BTC-USD'], [`POST ${ROOT}/v2/strategy-symbols`]],
    ['strategies deactivate', createStrategiesCommand, ['deactivate', 's1', 'BTC-USD'], [`DELETE ${ROOT}/v2/strategy-symbols/s1/BTC-USD`]],
    ['strategies status', createStrategiesCommand, ['status', 's1'], [`GET ${ROOT}/v2/strategy-symbols/strategy/s1`]],
    ['backtest status', createBacktestCommand, ['status', 'bt1'], [`GET ${ROOT}/v2/backtests/bt1`]],
  ])('%s', async (_name, create, args, expected) => {
    const urls = await run(create(), args);
    expect(urls).toEqual(expected);
  });

  test('a configured apiUrl ending in /v2 does not double the prefix', async () => {
    (getApiUrl as jest.Mock).mockResolvedValue(`${ROOT}/v2/`);
    expect(await run(createBriefingCommand(), [])).toEqual([`GET ${ROOT}/v2/briefing/daily`]);
    requests = [];
    expect(await run(createBacktestCommand(), ['status', 'bt1'])).toEqual([`GET ${ROOT}/v2/backtests/bt1`]);
  });
});

describe('call-site guard', () => {
  test('no source file passes a path starting with /v2/ to an API client', () => {
    // Whole-file match so multi-line calls like get<T>(\n  '/v2/...') are caught too
    const callWithV2Path = /\.(get|post|put|delete)(<[^>]*>)?\(\s*['"`]\/v2\//g;
    const offenders = readdirSync(__dirname)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
      .flatMap((f) => {
        const source = readFileSync(join(__dirname, f), 'utf-8');
        return [...source.matchAll(callWithV2Path)].map(
          (m) => `${f}:${source.slice(0, m.index).split('\n').length}`
        );
      });
    expect(offenders).toEqual([]);
  });
});
