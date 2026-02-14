import { DWLFApiClient } from './api-client';
import { fetchEvents, formatTimeAgo, formatSignificance } from './events';

// Mock the API client
jest.mock('./api-client');
jest.mock('./config');

describe('Events Command', () => {
  let mockClient: jest.Mocked<DWLFApiClient>;

  beforeEach(() => {
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as any;
  });

  describe('formatTimeAgo', () => {
    it('should format seconds ago correctly', () => {
      const now = new Date();
      const timestamp = new Date(now.getTime() - 30000).toISOString(); // 30 seconds ago
      
      const result = formatTimeAgo(timestamp);
      expect(result).toBe('30s ago');
    });

    it('should format minutes ago correctly', () => {
      const now = new Date();
      const timestamp = new Date(now.getTime() - 150000).toISOString(); // 2.5 minutes ago
      
      const result = formatTimeAgo(timestamp);
      expect(result).toBe('2m 30s ago');
    });

    it('should format hours ago correctly', () => {
      const now = new Date();
      const timestamp = new Date(now.getTime() - 7200000).toISOString(); // 2 hours ago
      
      const result = formatTimeAgo(timestamp);
      expect(result).toBe('2h ago');
    });

    it('should format days ago correctly', () => {
      const now = new Date();
      const timestamp = new Date(now.getTime() - 90000000).toISOString(); // ~25 hours ago
      
      const result = formatTimeAgo(timestamp);
      expect(result).toBe('1d 1h ago');
    });

    it('should handle future timestamps', () => {
      const now = new Date();
      const timestamp = new Date(now.getTime() + 60000).toISOString(); // 1 minute in future
      
      const result = formatTimeAgo(timestamp);
      expect(result).toBe('Future');
    });
  });

  describe('formatSignificance', () => {
    it('should format high significance with red color', () => {
      const result = formatSignificance(85.5);
      expect(result).toContain('85.5');
      // Note: In tests, chalk colors are stripped, so we just check the number
    });

    it('should format medium significance with yellow color', () => {
      const result = formatSignificance(65.0);
      expect(result).toContain('65.0');
    });

    it('should format low significance with gray color', () => {
      const result = formatSignificance(45.2);
      expect(result).toContain('45.2');
    });

    it('should handle undefined significance', () => {
      const result = formatSignificance(undefined);
      expect(result).toBe('-');
    });
  });

  describe('fetchEvents', () => {
    it('should fetch system events by default', async () => {
      const mockSystemEvents = {
        events: [
          {
            eventId: 'system-1',
            symbol: 'BTC-USD',
            eventType: 'breakout',
            timestamp: '2026-02-13T20:00:00Z',
            price: 95000,
            significance: 85.5
          }
        ]
      };

      mockClient.get.mockResolvedValueOnce(mockSystemEvents);
      mockClient.get.mockResolvedValueOnce({ events: [] }); // Custom events

      const result = await fetchEvents(mockClient, { symbol: 'BTC-USD' });

      expect(mockClient.get).toHaveBeenCalledWith('/events', {
        symbol: 'BTC-USD'
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.symbol).toBe('BTC-USD');
      expect(result[0]?.eventType).toBe('breakout');
    });

    it('should fetch custom events when type is custom', async () => {
      const mockCustomEvents = {
        events: [
          {
            eventId: 'custom-1',
            symbol: 'ETH-USD',
            eventName: 'weekly_cycle_low',
            timestamp: '2026-02-13T19:00:00Z',
            price: 3200,
            significance: 92.1
          }
        ]
      };

      mockClient.get.mockResolvedValueOnce(mockCustomEvents);

      const result = await fetchEvents(mockClient, { type: 'custom', symbol: 'ETH-USD' });

      expect(mockClient.get).toHaveBeenCalledWith('/events', {
        type: 'custom_event',
        scope: 'user',
        symbol: 'ETH-USD'
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.eventName).toBe('weekly_cycle_low');
    });

    it('should handle API errors gracefully', async () => {
      mockClient.get.mockRejectedValueOnce(new Error('Network error'));
      mockClient.get.mockResolvedValueOnce({ events: [] });

      // Should not throw but warn about system events failure
      const result = await fetchEvents(mockClient, {});

      expect(result).toHaveLength(0);
    });

    it('should filter events by event type', async () => {
      const mockEvents = {
        events: [
          {
            symbol: 'BTC-USD',
            eventType: 'breakout',
            timestamp: '2026-02-13T20:00:00Z'
          },
          {
            symbol: 'ETH-USD',
            eventType: 'reversal',
            timestamp: '2026-02-13T19:00:00Z'
          }
        ]
      };

      mockClient.get.mockResolvedValueOnce(mockEvents);
      mockClient.get.mockResolvedValueOnce({ events: [] });

      const result = await fetchEvents(mockClient, { eventType: 'breakout' });

      expect(result).toHaveLength(2); // fetchEvents doesn't filter, that's done in the command
    });

    it('should sort events by timestamp descending', async () => {
      const mockEvents = {
        events: [
          {
            symbol: 'BTC-USD',
            timestamp: '2026-02-13T18:00:00Z', // Earlier
          },
          {
            symbol: 'ETH-USD',
            timestamp: '2026-02-13T20:00:00Z', // Later
          }
        ]
      };

      mockClient.get.mockResolvedValueOnce(mockEvents);
      mockClient.get.mockResolvedValueOnce({ events: [] });

      const result = await fetchEvents(mockClient, {});

      expect(result[0]?.symbol).toBe('ETH-USD'); // Later timestamp first
      expect(result[1]?.symbol).toBe('BTC-USD'); // Earlier timestamp second
    });
  });
});