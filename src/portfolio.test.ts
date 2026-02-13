import { Command } from 'commander';
import { createPortfolioCommand } from './portfolio';

// Mock the dependencies
jest.mock('./config', () => ({
  isAuthenticated: jest.fn().mockResolvedValue(true),
  getApiKey: jest.fn().mockResolvedValue('dwlf_sk_test_key'),
  getApiUrl: jest.fn().mockResolvedValue('https://api.dwlf.co.uk'),
}));

jest.mock('./api-client', () => ({
  DWLFApiClient: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
}));

// Mock ora spinner
jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
  }));
});

describe('Portfolio Command', () => {
  let portfolioCommand: Command;
  let mockConsoleLog: jest.SpiedFunction<typeof console.log>;
  let mockConsoleError: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    portfolioCommand = createPortfolioCommand();
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('Command Structure', () => {
    it('should create a portfolio command with correct name and alias', () => {
      expect(portfolioCommand.name()).toBe('portfolio');
      expect(portfolioCommand.alias()).toBe('pf');
      expect(portfolioCommand.description()).toBe('Portfolio management and analysis');
    });

    it('should have all expected subcommands', () => {
      const subcommands = portfolioCommand.commands.map(cmd => cmd.name());
      expect(subcommands).toContain('list');
      expect(subcommands).toContain('overview');
      expect(subcommands).toContain('trades');
      expect(subcommands).toContain('performance');
    });

    it('should have correct aliases for subcommands', () => {
      const listCommand = portfolioCommand.commands.find(cmd => cmd.name() === 'list');
      const overviewCommand = portfolioCommand.commands.find(cmd => cmd.name() === 'overview');
      const perfCommand = portfolioCommand.commands.find(cmd => cmd.name() === 'performance');
      
      expect(listCommand?.alias()).toBe('ls');
      expect(overviewCommand?.alias()).toBe('show');
      expect(perfCommand?.alias()).toBe('perf');
    });
  });

  describe('List Command', () => {
    it('should have correct options', () => {
      const listCommand = portfolioCommand.commands.find(cmd => cmd.name() === 'list');
      const options = listCommand?.options.map(opt => opt.long);
      
      expect(options).toContain('--compact');
      expect(options).toContain('--json');
    });

    it('should have compact and json short options', () => {
      const listCommand = portfolioCommand.commands.find(cmd => cmd.name() === 'list');
      const shortOptions = listCommand?.options.map(opt => opt.short);
      
      expect(shortOptions).toContain('-c');
      expect(shortOptions).toContain('-j');
    });
  });

  describe('Overview Command', () => {
    it('should have correct options', () => {
      const overviewCommand = portfolioCommand.commands.find(cmd => cmd.name() === 'overview');
      const options = overviewCommand?.options.map(opt => opt.long);
      
      expect(options).toContain('--portfolio');
      expect(options).toContain('--compact');
      expect(options).toContain('--json');
    });

    it('should have portfolio short option', () => {
      const overviewCommand = portfolioCommand.commands.find(cmd => cmd.name() === 'overview');
      const shortOptions = overviewCommand?.options.map(opt => opt.short);
      
      expect(shortOptions).toContain('-p');
    });
  });

  describe('Trades Command', () => {
    it('should have correct options', () => {
      const tradesCommand = portfolioCommand.commands.find(cmd => cmd.name() === 'trades');
      const options = tradesCommand?.options.map(opt => opt.long);
      
      expect(options).toContain('--status');
      expect(options).toContain('--limit');
      expect(options).toContain('--compact');
      expect(options).toContain('--json');
    });

    it('should have correct short options', () => {
      const tradesCommand = portfolioCommand.commands.find(cmd => cmd.name() === 'trades');
      const shortOptions = tradesCommand?.options.map(opt => opt.short);
      
      expect(shortOptions).toContain('-s');
      expect(shortOptions).toContain('-l');
      expect(shortOptions).toContain('-c');
      expect(shortOptions).toContain('-j');
    });
  });

  describe('Performance Command', () => {
    it('should have correct options', () => {
      const perfCommand = portfolioCommand.commands.find(cmd => cmd.name() === 'performance');
      const options = perfCommand?.options.map(opt => opt.long);
      
      expect(options).toContain('--portfolio');
      expect(options).toContain('--json');
    });

    it('should have portfolio short option', () => {
      const perfCommand = portfolioCommand.commands.find(cmd => cmd.name() === 'performance');
      const shortOptions = perfCommand?.options.map(opt => opt.short);
      
      expect(shortOptions).toContain('-p');
      expect(shortOptions).toContain('-j');
    });
  });

  describe('Command Descriptions', () => {
    it('should have meaningful descriptions for all subcommands', () => {
      const listCommand = portfolioCommand.commands.find(cmd => cmd.name() === 'list');
      const overviewCommand = portfolioCommand.commands.find(cmd => cmd.name() === 'overview');
      const tradesCommand = portfolioCommand.commands.find(cmd => cmd.name() === 'trades');
      const perfCommand = portfolioCommand.commands.find(cmd => cmd.name() === 'performance');
      
      expect(listCommand?.description()).toBe('List all portfolios');
      expect(overviewCommand?.description()).toBe('Show portfolio overview with holdings');
      expect(tradesCommand?.description()).toBe('Show trade history');
      expect(perfCommand?.description()).toBe('Show portfolio performance metrics');
    });
  });
});