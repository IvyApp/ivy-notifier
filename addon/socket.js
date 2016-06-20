import Socket from 'ivy-notifier/sockets/socket';
import { warn } from 'ember-debug';

export default Socket.extend({
  init() {
    this._super(...arguments);

    warn("The 'ivy-notifier/socket' module is deprecated, use 'ivy-notifier/sockets/socket' instead", false, {
      id: 'ivy-notifier.socket-module'
    });
  }
});
