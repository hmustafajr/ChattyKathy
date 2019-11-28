const express = require('express');
const bodyParser = require('body-parser');
const EventEmitter = require('events');

const PORT = process.env.PORT || 80;

const app = express();
app.use(bodyParser.json());

class WebhookListener extends EventEmitter {
  listen() {
    app.post('/kofi', (req, res) => {
      const data = req.body.data;
      const { message, timestamp } = data;
      const amount = parseFloat(data.amount);
      const senderName = data.from_name;
      const paymentId = data.message_id;
      const paymentSource = 'Ko-fi';

      //the OK status is intended for me to observe in Postman
	    //ko-fi disregards response body and only observes 200 status
      res.send({ status: 'OK' });

      this.emit(
        'donation',
        paymentSource,
        paymentId,
        timestamp,
        amount,
        senderName,
        message,
      );
    });

    app.listen(PORT);
  }
}

const listener = new WebhookListener();
listener.listen();

module.exports = listener;
