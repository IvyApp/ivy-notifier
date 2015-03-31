# ivy-notifier

Ember CLI addon that provides easy realtime notifications.

Currently only [Pusher](https://pusher.com/) is supported.

## Installation

From within your Ember CLI app, run:

```sh
ember install:addon ivy-notifier
```

## Usage

First, add the Pusher javascript to your `app/index.html` file:

```html
<script src="//js.pusher.com/2.2/pusher.min.js" type="text/javascript"></script>
```

Next, define a socket inside your application. Since we're using Pusher, we'll
define a subclass of `PusherSocket` inside `app/sockets/pusher.js`:

```javascript
import PusherSocket from 'ivy-notifier/sockets/pusher';

export default PusherSocket.extend({
  pusher: new Pusher('YOUR_PUSHER_ACCESS_KEY')
});
```

Then mix in the `NotifiableMixin` to any controller or route and define
a `subscriptions` hash to map events to actions:

```javascript
import Ember from 'ember';
import NotifiableMixin from 'ivy-notifier/mixins/notifiable';

export default Ember.Controller.extend(NotifiableMixin, {
  subscriptions: {
    pusher: {
      'test_channel': {
        'test_event': 'testEvent'
      }
    }
  },

  actions: {
    testEvent: function(data) {
      // do something with data...
    }
  }
});
```

This example will use the "pusher" socket we created above, and will subscribe
the controller to any "test\_event" events on the "test\_channel" channel. Each
time a "test\_event" event comes in, the "testEvent" action will be triggered,
passing along the event's data (if any).

## Running

* `ember server`
* Visit your app at http://localhost:4200.

## Running Tests

* `ember test`
* `ember test --server`

## Building

* `ember build`

For more information on using ember-cli, visit [http://www.ember-cli.com/](http://www.ember-cli.com/).
