// Mock ora spinner for tests
const ora = jest.fn().mockImplementation((text) => {
  return {
    start: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    text: text,
  };
});

module.exports = ora;