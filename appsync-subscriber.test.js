// Mock the WebSocket class
jest.mock('ws', () => {
  return class MockWebSocket {
    constructor(url, protocol) {
      this.url = url;
      this.protocol = protocol;
      this.readyState = 0;
      this.on = jest.fn();
      this.onmessage = jest.fn();
      this.onerror = jest.fn();
      this.onclose = jest.fn();
      this.send = jest.fn();
      this.close = jest.fn();

      // Simulate connection success
      setTimeout(() => {
        this.readyState = 1;
        if (this.onopen) {
          this.onopen();
        }
      }, 100);
    }
  };
});

const AppSyncSubscriber = require('./appsync-subscriber'); // Your module

describe('AppSyncSubscriber', () => {
  const endpoint = 'wss://example.appsync-api.com/graphql';
  const apiKey = 'your-api-key';
  const subscriptionQuery = `subscription MySubscription {
    onCreateItem {
      id
      name
    }
  }`;
  AppSyncSubscriber.configure({
    endpoint, 
    apiKey
})

  afterEach(() => {
    jest.clearAllMocks(); 
  });

  it('should connect and start a subscription', (done) => {
    const subscriber = AppSyncSubscriber.graphql({ 
      query: subscriptionQuery 
    }).subscribe({
      next: (data) => {
        expect(data).toBeDefined();
        done(); // Indicate the test is complete
      },
      error: (error) => {
        done(error); // If there's an error, fail the test
      }
    });

    // Access and trigger the mock WebSocket instance after subscription
    const mockWs = subscriber.ws; // Get the instantiated WebSocket

    // Simulate messages from the AppSync endpoint
    mockWs.onmessage({ data: JSON.stringify({ type: 'connection_ack' }) }); // Acknowledge the connection
    mockWs.onmessage({
      data: JSON.stringify({
        type: 'data',
        payload: {
          data: {
            onCreateItem: { id: '1', name: 'Test Item' },
          },
        },
      }),
    }); // Send subscription data
    done()
  });

  it('should handle subscription errors', (done) => {
    const subscriber = AppSyncSubscriber.graphql({ 
      query: subscriptionQuery 
    }).subscribe({
      next: () => {}, 
      error: (error) => {
        expect(error).toBeDefined(); 
        done();
      }
    });

    const mockWs = subscriber.ws;;
    mockWs.onmessage({ data: JSON.stringify({
      type: 'error',
      payload: {
        errors: [{ message: 'Subscription error' }]
      }
    }) });
    done()
  });

  it('should disconnect gracefully', () => {
    const subscriber = AppSyncSubscriber.graphql({ 
      query: subscriptionQuery 
    }).subscribe({ next: () => {}, error: () => {} });
    const mockWs = subscriber.ws;;

    subscriber.unsubscribe();
    expect(mockWs.close).toHaveBeenCalled();
  });
});
