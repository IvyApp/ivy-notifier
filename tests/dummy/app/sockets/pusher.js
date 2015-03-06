/* global Pusher */
import PusherSocket from 'ivy-notifier/sockets/pusher';

export default PusherSocket.extend({
  pusher: new Pusher('5df8ac576dcccf4fd076')
});
