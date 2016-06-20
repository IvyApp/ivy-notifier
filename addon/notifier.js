import Notifier from 'ivy-notifier/services/notifier';
import { warn } from 'ember-debug';

export default Notifier.extend({
  init() {
    this._super(...arguments);

    warn("The 'ivy-notifier/notifier' module is deprecated, use 'ivy-notifier/services/notifier' instead", false, {
      id: 'ivy-notifier.notifier-module'
    });
  }
});
