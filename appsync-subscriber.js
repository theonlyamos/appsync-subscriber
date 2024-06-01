// @ts-check

const WebSocket = require("ws");
const crypto = require('crypto'); 

class AppSyncSubscriber {
  static appSyncRealtimeEndpoint;
  static appSyncEndpoint;
  static apiKey;
  static verbose;

  
  constructor() {
    this.subscriptionQuery = '';
    this.variables = {};
    this.ws = null;
    this.onSubscriptionData = null;
    this.onError = null;
  }

  /**
   * Configures the AppSyncSubscriber class with the given endpoint and API key.
   * 
   * @param {Object} appsyncConfiguration - The AppSync Configuration.
   * @param {string} [appsyncConfiguration.endpoint] - The AppSync GraphQL endpoint URL.
   * @param {string} [appsyncConfiguration.apiKey] - The AppSync API key.
   * @param {Boolean} [appsyncConfiguration.verbose] - Turn verbosity on or off
   */
  static configure(appsyncConfiguration) {
    AppSyncSubscriber.appSyncEndpoint = appsyncConfiguration?.endpoint
    AppSyncSubscriber.appSyncRealtimeEndpoint = appsyncConfiguration?.endpoint?.replace('http', 'ws').replace('api', 'realtime-api');
    AppSyncSubscriber.apiKey = appsyncConfiguration?.apiKey;
    AppSyncSubscriber.verbose = appsyncConfiguration?.verbose || false;
  }

  /**
   * Creates an AppSyncSubscriber instance.
   * 
   * @param {Object} subscriptionConfig - Configuration for the subscription.
   * @param {string} subscriptionConfig.query - The GraphQL subscription query string.
   * @param {Object} [subscriptionConfig.variables] - Variables for the subscription query.
   */
  static graphql(subscriptionConfig) {
    const subscriber = new AppSyncSubscriber()
    subscriber.subscriptionQuery = subscriptionConfig.query;
    subscriber.variables = subscriptionConfig.variables || {};

    return subscriber
  }

  /**
   * Starts the AppSync subscription.
   */
  startSubscription() {
    if (!this.ws) {
      console.error("WebSocket connection is not established yet.");
      return;
    }
  
    const subData = {
      id: crypto.randomUUID(),
      type: "start",
      payload: {
        data: JSON.stringify({
          query: this.subscriptionQuery,
          variables: this.variables
        }),
        extensions: {
          authorization: {
            host: new URL(AppSyncSubscriber.appSyncEndpoint).host, 
            "x-api-key": AppSyncSubscriber.apiKey, 
            "x-amz-date": new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14) + 'Z',
            "x-amz-user-agent": "aws-amplify/4.7.14 js",
          },
        },
      },
    };
    this.ws.send(JSON.stringify(subData));
  }

  /**
   * Subscribes to the AppSync subscription.
   * 
   * @param {Object} callbacks - Callback functions for handling subscription events.
   * @param {function(data: Object)} [callbacks.next] - Callback for subscription data.
   * @param {function(error: SubscriptionError)} [callbacks.error] - Callback for subscription errors.
   * @returns {AppSyncSubscriber} The current instance for method chaining.
   */
  subscribe(callbacks) {
    this.onSubscriptionData = callbacks.next || (() => {});
    this.onError = callbacks.error || (console.error);

    const payload = {};
    const header = {
      host: new URL(AppSyncSubscriber.appSyncEndpoint).host, // Use static property
      "x-api-key": AppSyncSubscriber.apiKey, // Use static property
      "x-amz-date": new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14) + 'Z',
    };

    const headerBase64 = Buffer.from(JSON.stringify(header)).toString('base64');
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');

    this.ws = new WebSocket(
      `${AppSyncSubscriber.appSyncRealtimeEndpoint}?header=${headerBase64}&payload=${payloadBase64}`,
      'graphql-ws'
    );

    this.ws.on('open', () => {
      // @ts-ignore
      this.ws.send(JSON.stringify({ type: "connection_init" }));
    });

    this.ws.on('message', (message) => {
      const messageString = message.toString();
      const msg = JSON.parse(messageString);

      if (msg?.type === 'connection_ack') {
        this.startSubscription();
      } else if (msg?.type === 'data') {
        this.onSubscriptionData(msg?.payload?.data);
      } else if (msg?.type === 'error') {
        this.onError(msg?.payload?.errors);
      }
    });

    this.ws.on('error', (error) => {
      console.error('AppSync WebSocket error:', error);
      this.onError(error); 
    });

    this.ws.on('open', () => {
      if (AppSyncSubscriber.verbose)
        console.log('AppSync WebSocket Opened');
    });

    this.ws.on('close', () => {
      if (AppSyncSubscriber.verbose)
        console.log('AppSync WebSocket Closed');
    });
    
    return this; 
  }

  /**
   * Disconnects from the AppSync subscription.
   */
  unsubscribe() {
    if (this.ws && this.ws.readyState) {
      this.ws.send(JSON.stringify({ type: "stop" }))
      this.ws.close();
    }
  }
}

/**
 * @typedef {Object} SubscriptionError
 * @property {Array<{message: string}>} errors - Array of errors.
 */

module.exports = AppSyncSubscriber;
