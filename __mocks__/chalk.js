module.exports = {
  red: jest.fn((str) => str),
  green: jest.fn((str) => str),
  yellow: jest.fn((str) => str),
  cyan: jest.fn((str) => str),
  gray: jest.fn((str) => str),
  default: {
    red: jest.fn((str) => str),
    green: jest.fn((str) => str),
    yellow: jest.fn((str) => str),
    cyan: jest.fn((str) => str),
    gray: jest.fn((str) => str),
  }
};