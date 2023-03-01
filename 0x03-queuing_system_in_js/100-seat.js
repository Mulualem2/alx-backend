import express from 'express';
import kue from 'kue';
import redis from 'redis';
import { promisify } from 'util';

// utils =================================================

// redis =================================================

const client = redis.createClient();
const getAsync = promisify(client.get).bind(client);
let reservationEnabled;

const seatsKey = 'available_seats';

function reserveSeat(number) {
  client.set(seatsKey, number);
}

async function getCurrentAvailableSeats() {
  const availableSeats = await getAsync(seatsKey);
  return availableSeats;
}

client.on('error', (error) => {
  console.log(`Redis client not connected to the server: ${error.message}`);
});

client.on('connect', () => {
  console.log('Redis client connected to the server');

  reserveSeat(50);
  reservationEnabled = true;
});

// kue  =================================================

const queue = kue.createQueue();
const queueName = 'reserve_seat';

// express  =================================================

const app = express();
const port = 1245;

app.listen(port, () => {
  console.log(`app listening at http://localhost:${port}`);
});

app.get('/available_seats', async (req, res) => {
  const availableSeats = await getCurrentAvailableSeats();
  res.json({ numberOfAvailableSeats: availableSeats });
});

app.get('/reserve_seat', (req, res) => {
  if (reservationEnabled === false) {
    res.json({ status: 'Reservation are blocked' });
    return;
  }

  const jobFormat = {};

  const job = queue.create(queueName, jobFormat).save((err) => {
    if (err) {
      res.json({ status: 'Reservation failed' });
    } else {
      res.json({ status: 'Reservation in process' });
    }
  });

  job.on('complete', () => {
    console.log(`Seat reservation job ${job.id} completed`);
  });

  job.on('failed', (errorMessage) => {
    console.log(`Seat reservation job ${job.id} failed: ${errorMessage}`);
  });
});

app.get('/process', async (req, res) => {
  queue.process(queueName, async (job, done) => {
    let availableSeats = await getCurrentAvailableSeats();

    if (availableSeats <= 0) {
      done(Error('Not enough seats available'));
    }

    availableSeats = Number(availableSeats) - 1;

    reserveSeat(availableSeats);

    if (availableSeats <= 0) {
      reservationEnabled = false;
    }

    done();
  });
  res.json({ status: 'Queue processing' });
});
