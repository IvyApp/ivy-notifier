import Notifier from 'ivy-notifier/notifier';

export default {
  name: 'ivy-notifier',

  initialize: function(container) {
    container.register('notifier:main', container.lookupFactory('notifier:application') || Notifier);

    container.injection('controller', 'notifier', 'notifier:main');
    container.injection('route', 'notifier', 'notifier:main');
  }
};
