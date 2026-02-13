// Mock cli-table3 for tests
const Table = jest.fn().mockImplementation(() => {
  return {
    push: jest.fn(),
    toString: jest.fn().mockReturnValue('Mocked table output'),
  };
});

module.exports = Table;