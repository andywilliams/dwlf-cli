import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { DWLFApiClient } from './api-client';
import { getApiKey, getApiUrl, isAuthenticated } from './config';

export interface Event {
  eventId?: string;
  eventName?: string;
  eventType?: string;
  symbol: string;
  timeframe?: string;
  timestamp: string;
  price?: number;
  significance?: number;
  description?: string;
  context?: string;
  notifyOnFire?: boolean;
  fired?: boolean;
  firedAt?: string;
  metadata?: Record<string, any>;
}

export interface CustomEventNotification {
  notificationId: string;
  eventId: string;
  eventName: string;
  symbol: string;
  firedAt: string;
  price: number;
  significance?: number;
  metadata?: Record<string, any>;
}

export interface EventsResponse {
  events: Event[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface CustomEventsResponse {
  customEvents: Array<{
    eventId: string;
    name: string;
    description?: string;
    notifyOnFire: boolean;
    isActive: boolean;
    createdAt: string;
  }>;
}

export interface EventFilters {
  symbol?: string;
  eventType?: string;
  timeframe?: string;
  limit?: number;
  days?: number;
  type?: 'system' | 'custom' | 'all';
}

/**
 * Calculate human-readable time ago
 */
export function formatTimeAgo(timestamp: string): string {
  // Handle missing or invalid timestamps
  if (!timestamp) return 'Unknown';
  
  const now = new Date();
  const eventTime = new Date(timestamp);
  
  // Check if the date is invalid
  if (isNaN(eventTime.getTime())) {
    return 'Invalid date';
  }
  
  const diffMs = now.getTime() - eventTime.getTime();
  
  if (diffMs < 0) return 'Future';
  
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    const hours = diffHours % 24;
    return hours > 0 ? `${diffDays}d ${hours}h ago` : `${diffDays}d ago`;
  }
  
  if (diffHours > 0) {
    const minutes = diffMinutes % 60;
    return minutes > 0 ? `${diffHours}h ${minutes}m ago` : `${diffHours}h ago`;
  }
  
  if (diffMinutes > 0) {
    const seconds = diffSeconds % 60;
    return seconds > 0 ? `${diffMinutes}m ${seconds}s ago` : `${diffMinutes}m ago`;
  }
  
  return `${diffSeconds}s ago`;
}

/**
 * Format price with appropriate precision
 */
function formatPrice(price: number | undefined): string {
  if (!price) return '-';
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

/**
 * Format significance score with color coding
 */
export function formatSignificance(significance: number | undefined): string {
  if (!significance) return '-';
  
  const score = significance.toFixed(1);
  if (significance >= 80) return chalk.red(score);      // High significance
  if (significance >= 60) return chalk.yellow(score);  // Medium significance
  return chalk.gray(score);                            // Low significance
}

/**
 * Format event type with color coding
 */
function formatEventType(eventType: string | undefined, eventName?: string): string {
  const type = eventType || eventName || 'unknown';
  
  // Color code based on common event types
  if (type.includes('breakout') || type.includes('break')) return chalk.green(type);
  if (type.includes('reversal')) return chalk.blue(type);
  if (type.includes('support') || type.includes('resistance')) return chalk.cyan(type);
  if (type.includes('volume')) return chalk.magenta(type);
  if (type.includes('trend')) return chalk.yellow(type);
  
  return type;
}

/**
 * Fetch system events from the API
 */
async function fetchSystemEvents(client: DWLFApiClient, filters: EventFilters = {}): Promise<Event[]> {
  try {
    const params: Record<string, any> = {};
    
    if (filters.symbol) params.symbol = filters.symbol.toUpperCase();
    if (filters.limit) params.limit = filters.limit;
    
    const response = await client.get<EventsResponse>('/events', params);
    return response.events || [];
  } catch (error: any) {
    throw new Error(`Failed to fetch system events: ${error.message}`);
  }
}

/**
 * Fetch custom events from the API
 */
async function fetchCustomEvents(client: DWLFApiClient, filters: EventFilters = {}): Promise<Event[]> {
  try {
    const params: Record<string, any> = {
      type: 'custom_event',
      scope: 'user'
    };
    
    if (filters.symbol) params.symbol = filters.symbol.toUpperCase();
    if (filters.days) params.days = filters.days;
    
    const response = await client.get<EventsResponse>('/events', params);
    return response.events || [];
  } catch (error: any) {
    throw new Error(`Failed to fetch custom events: ${error.message}`);
  }
}

/**
 * Fetch custom event notifications
 */
async function fetchCustomEventNotifications(client: DWLFApiClient, days: number = 7): Promise<CustomEventNotification[]> {
  try {
    const params = { days };
    const response = await client.get<{ notifications: CustomEventNotification[] }>('/custom-events/notifications', params);
    return response.notifications || [];
  } catch (error: any) {
    throw new Error(`Failed to fetch custom event notifications: ${error.message}`);
  }
}

/**
 * Fetch all events based on filters
 */
export async function fetchEvents(client: DWLFApiClient, filters: EventFilters = {}): Promise<Event[]> {
  const allEvents: Event[] = [];
  
  if (filters.type === 'system' || filters.type === 'all' || !filters.type) {
    try {
      const systemEvents = await fetchSystemEvents(client, filters);
      allEvents.push(...systemEvents);
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not fetch system events'));
    }
  }
  
  if (filters.type === 'custom' || filters.type === 'all' || !filters.type) {
    try {
      const customEvents = await fetchCustomEvents(client, filters);
      allEvents.push(...customEvents);
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not fetch custom events'));
    }
  }
  
  // Sort by timestamp (newest first)
  return allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Display events in a table format
 */
function displayEventsTable(events: Event[], showDetails: boolean = false): void {
  if (events.length === 0) {
    console.log(chalk.yellow('📭 No events found matching your criteria.'));
    return;
  }

  const table = new Table({
    head: showDetails
      ? [
          chalk.cyan('Symbol'),
          chalk.cyan('Event'),
          chalk.cyan('Type'),
          chalk.cyan('Price'),
          chalk.cyan('Significance'),
          chalk.cyan('Time'),
          chalk.cyan('Description')
        ]
      : [
          chalk.cyan('Symbol'),
          chalk.cyan('Event'),
          chalk.cyan('Price'),
          chalk.cyan('Significance'),
          chalk.cyan('Time')
        ],
    style: {
      head: [],
      border: []
    }
  });

  events.forEach(event => {
    const eventDisplay = formatEventType(event.eventType, event.eventName);
    const timeAgo = formatTimeAgo(event.firedAt || event.timestamp);
    
    const row = showDetails
      ? [
          event.symbol,
          eventDisplay,
          event.eventType ? 'System' : 'Custom',
          formatPrice(event.price),
          formatSignificance(event.significance),
          timeAgo,
          event.description || event.context || '-'
        ]
      : [
          event.symbol,
          eventDisplay,
          formatPrice(event.price),
          formatSignificance(event.significance),
          timeAgo
        ];

    table.push(row);
  });

  console.log(table.toString());
}

/**
 * Display event notifications table
 */
function displayNotificationsTable(notifications: CustomEventNotification[]): void {
  if (notifications.length === 0) {
    console.log(chalk.yellow('📭 No recent custom event notifications.'));
    return;
  }

  const table = new Table({
    head: [
      chalk.cyan('Symbol'),
      chalk.cyan('Event'),
      chalk.cyan('Price'),
      chalk.cyan('Fired'),
      chalk.cyan('Significance')
    ],
    style: {
      head: [],
      border: []
    }
  });

  notifications.forEach(notification => {
    const timeAgo = formatTimeAgo(notification.firedAt);
    
    table.push([
      notification.symbol,
      chalk.green(notification.eventName),
      formatPrice(notification.price),
      timeAgo,
      formatSignificance(notification.significance)
    ]);
  });

  console.log(table.toString());
}

/**
 * Display summary statistics
 */
function displayEventsSummary(events: Event[]): void {
  if (events.length === 0) return;

  // Fix event categorization to be mutually exclusive
  // Custom events typically have eventType="custom_event" or lack eventType entirely
  const customEvents = events.filter(e => 
    !e.eventType || e.eventType === 'custom_event' || (e.eventName && !e.eventType)
  );
  const systemEvents = events.filter(e => 
    e.eventType && e.eventType !== 'custom_event'
  );
  const firedEvents = events.filter(e => e.fired || e.firedAt);
  
  const symbolCounts = events.reduce((acc, event) => {
    acc[event.symbol] = (acc[event.symbol] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topSymbol = Object.entries(symbolCounts).sort(([,a], [,b]) => b - a)[0];
  
  console.log(chalk.bold('\n📊 Summary:'));
  console.log(`Total Events: ${chalk.cyan(events.length)}`);
  console.log(`System: ${chalk.green(systemEvents.length)} | Custom: ${chalk.blue(customEvents.length)}`);
  console.log(`Fired: ${chalk.yellow(firedEvents.length)}`);
  
  // Validate counts add up
  const totalCategorized = systemEvents.length + customEvents.length;
  if (totalCategorized !== events.length) {
    console.log(chalk.gray(`⚠️  Note: ${events.length - totalCategorized} events could not be categorized`));
  }
  
  if (topSymbol) {
    console.log(`Most Active Symbol: ${chalk.cyan(topSymbol[0])} (${topSymbol[1]} events)`);
  }
}

/**
 * Check authentication and create API client
 */
async function createAuthenticatedClient(): Promise<DWLFApiClient> {
  if (!await isAuthenticated()) {
    console.log(chalk.red('❌ Not authenticated.'));
    console.log(chalk.gray('Run `dwlf login` first to configure your API key.'));
    process.exit(1);
  }
  
  const apiKey = await getApiKey();
  const apiUrl = await getApiUrl();
  
  return new DWLFApiClient({ 
    apiKey: apiKey!, 
    baseUrl: apiUrl,
    rateLimit: { requests: 10, per: 1000 }
  });
}

/**
 * Create and configure the events command
 */
export function createEventsCommand(): Command {
  const eventsCommand = new Command('events')
    .description('View indicator and custom event monitoring')
    .option('--symbol <symbol>', 'filter by symbol (e.g., BTC-USD, AAPL)')
    .option('--type <type>', 'event source type (system, custom, all)', (value) => {
      const valid = ['system', 'custom', 'all'];
      if (!valid.includes(value.toLowerCase())) {
        throw new Error(`Type must be one of: ${valid.join(', ')}`);
      }
      return value.toLowerCase() as 'system' | 'custom' | 'all';
    })
    .option('--event-type <eventType>', 'filter by specific event type (e.g., breakout, reversal)')
    .option('--timeframe <timeframe>', 'filter by timeframe (1h, 4h, 1d, 1w)')
    .option('--limit <number>', 'limit number of results', parseInt)
    .option('--days <number>', 'number of days to look back for custom events', parseInt)
    .option('--details', 'show detailed information including descriptions')
    .option('--summary', 'show summary statistics')
    .option('--notifications', 'show only custom event notifications (events that fired)');

  eventsCommand.action(async (options) => {
    try {
      const client = await createAuthenticatedClient();
      
      // If notifications requested
      if (options.notifications) {
        const spinner = ora('Fetching custom event notifications...').start();
        try {
          const notifications = await fetchCustomEventNotifications(client, options.days || 7);
          spinner.stop();
          
          console.log(chalk.bold(`\n🔔 Custom Event Notifications`));
          console.log(chalk.gray(`Last ${options.days || 7} days`));
          
          displayNotificationsTable(notifications);
          
          if (notifications.length > 0) {
            console.log(chalk.dim(`\nShowing notifications for events that fired. Use --type custom to see all custom events.`));
          }
        } catch (error: any) {
          spinner.stop();
          console.error(chalk.red('Error:'), error.message);
          process.exit(1);
        }
        return;
      }
      
      // Build filters from options
      const filters: EventFilters = {
        symbol: options.symbol,
        type: options.type || 'all',
        eventType: options.eventType,
        timeframe: options.timeframe,
        limit: options.limit || 20,
        days: options.days || 7
      };
      
      // Fetch events
      const spinner = ora('Fetching events...').start();
      let events: Event[];
      
      try {
        events = await fetchEvents(client, filters);
        
        // Apply additional filtering
        if (filters.eventType) {
          events = events.filter(e => 
            (e.eventType && e.eventType.toLowerCase().includes(filters.eventType!.toLowerCase())) ||
            (e.eventName && e.eventName.toLowerCase().includes(filters.eventType!.toLowerCase()))
          );
        }
        
        if (filters.timeframe) {
          events = events.filter(e => e.timeframe === filters.timeframe);
        }
        
        // Limit results
        if (filters.limit) {
          events = events.slice(0, filters.limit);
        }
        
        spinner.stop();
      } catch (error: any) {
        spinner.stop();
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
      
      // Display results
      console.log(chalk.bold(`\n⚡ Market Events`));
      
      const typeDisplay = filters.type === 'all' ? 'System & Custom' : 
                         filters.type === 'system' ? 'System' : 'Custom';
      console.log(chalk.gray(`Type: ${typeDisplay}, showing ${events.length} events`));
      
      if (filters.symbol) {
        console.log(chalk.gray(`Filtered to: ${filters.symbol}`));
      }
      
      displayEventsTable(events, options.details);
      
      if (options.summary) {
        displayEventsSummary(events);
      }
      
      // Show helpful tips
      if (events.length > 0 && !options.details && !options.notifications) {
        console.log(chalk.dim(`\nTip: Use --details for descriptions, --notifications for fired events only`));
      }
      
      if (events.length === 0) {
        console.log(chalk.dim(`\nTry: --type all --days 30 to expand the search`));
      }

    } catch (error: any) {
      console.error(chalk.red('Unexpected error:'), error.message);
      process.exit(1);
    }
  });

  return eventsCommand;
}