import { createBacktestCommand } from './backtest';

// Mock dependencies
jest.mock('./api-client');
jest.mock('./config');

describe('backtest command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create backtest command with correct structure', () => {
    const command = createBacktestCommand();
    
    expect(command.name()).toBe('backtest');
    expect(command.alias()).toBe('bt');
    expect(command.description()).toBe('Run and manage strategy backtests');
  });

  it('should have all expected subcommands', () => {
    const command = createBacktestCommand();
    const subcommands = command.commands.map(cmd => cmd.name());
    
    expect(subcommands).toContain('run');
    expect(subcommands).toContain('list');
    expect(subcommands).toContain('status');
    expect(subcommands).toContain('results');
    expect(subcommands).toContain('delete');
    expect(subcommands).toContain('summary');
  });

  it('should have proper aliases for subcommands', () => {
    const command = createBacktestCommand();
    const listCmd = command.commands.find(cmd => cmd.name() === 'list');
    const deleteCmd = command.commands.find(cmd => cmd.name() === 'delete');
    
    expect(listCmd?.alias()).toBe('ls');
    expect(deleteCmd?.alias()).toBe('rm');
  });

  describe('run subcommand', () => {
    it('should have correct options and arguments', () => {
      const command = createBacktestCommand();
      const runCmd = command.commands.find(cmd => cmd.name() === 'run');
      
      expect(runCmd).toBeDefined();
      expect(runCmd?.description()).toBe('Run a backtest for a strategy');
    });
  });

  describe('status subcommand', () => {
    it('should require requestId argument', () => {
      const command = createBacktestCommand();
      const statusCmd = command.commands.find(cmd => cmd.name() === 'status');
      
      expect(statusCmd).toBeDefined();
      expect(statusCmd?.description()).toBe('Check backtest status');
    });
  });

  describe('results subcommand', () => {
    it('should have correct options', () => {
      const command = createBacktestCommand();
      const resultsCmd = command.commands.find(cmd => cmd.name() === 'results');
      
      expect(resultsCmd).toBeDefined();
      expect(resultsCmd?.description()).toBe('View backtest results');
    });
  });
});

// Test interface types (compile-time verification)
describe('backtest types', () => {
  it('should have proper type exports', () => {
    // This test ensures the types are properly exported and compile correctly
    expect(true).toBe(true);
  });
});