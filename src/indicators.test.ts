import { createIndicatorsCommand } from './indicators';

describe('indicators command', () => {
  it('should create a command with correct name and description', () => {
    const command = createIndicatorsCommand();
    
    expect(command.name()).toBe('indicators');
    expect(command.description()).toBe('View technical indicators, trendlines, and support/resistance levels');
  });

  it('should have expected options', () => {
    const command = createIndicatorsCommand();
    
    const options = command.options;
    const optionNames = options.map(opt => opt.long);
    
    expect(optionNames).toContain('--indicator');
    expect(optionNames).toContain('--interval');
    expect(optionNames).toContain('--trendlines');
    expect(optionNames).toContain('--levels');
    expect(optionNames).toContain('--all');
  });
});