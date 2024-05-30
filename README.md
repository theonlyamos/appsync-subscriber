# AppSync Subscriber

[![npm version](https://img.shields.io/npm/v/appsync-subscriber.svg)](https://www.npmjs.com/package/@theonlyamos/appsync-subscriber)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

A Node.js module for subscribing to AWS AppSync real-time GraphQL subscriptions using WebSockets.

## Features

- **Simplified Subscription Setup:** Easily connect to and manage AppSync real-time subscriptions.
- **Customizable:** Pass your GraphQL subscription query and variables.
- **Error Handling:** Provides clear mechanisms for handling subscription errors.
- **Generic:** Works with any AppSync subscription type.

## Installation

```bash
npm install @theonlyamos/appsync-subscriber
```

## Usage
Configure (Once Per Application):

```javascript
const AppSyncSubscriber = require('appsync-subscriber');

// Set your AppSync WebSocket endpoint and API key (from environment variables)
AppSyncSubscriber.configure({
    endpoint: ""    // AWS GRAPHQL ENDPOINT
    apiKey: ""      // APPSYNC API KEY
})
```

Subscribe to an event
```javascript
const subscriber = AppSyncSubscriber.graphql({
  query: `subscription OnCreateMessage($channelId: ID!) {
      onCreateMessage(channelId: $channelId) {
        id
        text
        author
      }
    }`,
  variables: { channelId: "12345" }
}).subscribe({
  next: (data) => {
      const newMessage = data.onCreateMessage;
      console.log("New message received:", newMessage);
      // Update your UI or application state with the new message
  },
  error: (error) => {
      console.error("Subscription error:", error);
      // Handle the error appropriately
  }
});
```

Unsubscribe
```javascript
// This unsubscribes and closes the connection
subscriber.unsubscribe()
```

## Contributing
We welcome contributions! Please read our CONTRIBUTING.md file for guidelines on how to get involved.

## License
This project is licensed under the Apache License 2.0 - see the LICENSE file for details.