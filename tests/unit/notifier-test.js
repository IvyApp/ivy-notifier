import Ember from 'ember';
import Socket from 'ivy-notifier/socket';
import Notifier from 'ivy-notifier/notifier';
import { module } from 'qunit';
import { test } from 'ember-qunit';

var container;

module('unit/notifier', {
  setup: function() {
    container = new Ember.Container();
  },

  teardown: function() {
    Ember.run(container, 'destroy');
  }
});

test('a subscriber can subscribe to a notifier', function(assert) {
  assert.expect(1);

  container.register('socket:test', Socket.extend({
    subscribe: function(subscriber, subscriptions) {
      assert.deepEqual(subscriptions, { event: 'event' });
    }
  }));

  var Subscriber = Ember.Controller.extend({
    subscriptions: {
      test: { event: 'event' }
    }
  });

  var notifier = Notifier.create({ container: container });
  var subscriber = Subscriber.create();

  notifier.subscribe(subscriber);
});

test('a subscriber can unsubscribe from a notifier', function(assert) {
  assert.expect(1);

  container.register('socket:test', Socket.extend({
    unsubscribe: function(subscriber, subscriptions) {
      assert.deepEqual(subscriptions, { event: 'event' });
    }
  }));

  var Subscriber = Ember.Controller.extend({
    subscriptions: {
      test: { event: 'event' }
    }
  });

  var notifier = Notifier.create({ container: container });
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

  var notifier = Notifier.create({ container: container });
  var subscriber = Subscriber.create();

  assert.throws(function() {
    notifier.subscribe(subscriber);
  }, /No socket was found for "test"/);
});
