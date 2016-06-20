import Ember from 'ember';
import Socket from 'ivy-notifier/sockets/socket';
import { moduleFor, test } from 'ember-qunit';

moduleFor('service:notifier', 'Unit | Service | notifier', {
  // Specify the other units that are required for this test.
  // needs: ['service:foo']
});

test('a subscriber can subscribe to a notifier', function(assert) {
  assert.expect(1);

  this.register('socket:test', Socket.extend({
    subscribe: function(subscriber, subscriptions) {
      assert.deepEqual(subscriptions, { event: 'event' });
    }
  }));

  var Subscriber = Ember.Controller.extend({
    subscriptions: {
      test: { event: 'event' }
    }
  });

  var notifier = this.subject();
  var subscriber = Subscriber.create();

  notifier.subscribe(subscriber);
});

test('a subscriber can unsubscribe from a notifier', function(assert) {
  assert.expect(1);

  this.register('socket:test', Socket.extend({
    unsubscribe: function(subscriber, subscriptions) {
      assert.deepEqual(subscriptions, { event: 'event' });
    }
  }));

  var Subscriber = Ember.Controller.extend({
    subscriptions: {
      test: { event: 'event' }
    }
  });

  var notifier = this.subject();
  var subscriber = Subscriber.create();

  notifier.subscribe(subscriber);
  notifier.unsubscribe(subscriber);
});

test('should throw an error if socket cannot be found', function(assert) {
  var Subscriber = Ember.Controller.extend({
    subscriptions: {
      test: { event: 'event' }
    }
  });

  var notifier = this.subject();
  var subscriber = Subscriber.create();

  assert.throws(function() {
    notifier.subscribe(subscriber);
  }, /No socket was found for 'test'/);
});
