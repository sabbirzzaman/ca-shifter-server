const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// connect mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dmtdp.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// verify user jwt
const verifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    res.status(401).send({ message: 'Unauthorized Access' });
  } else {
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).send({ message: 'Forbidden Access' });
      } else {
        req.decoded = decoded;
        next();
      }
    });
  }
};

const run = async () => {
  await client.connect();
  console.log('hello')

  try {
    const partsCollection = client.db('db-collections').collection('parts');

    const usersCollection = client.db('db-collections').collection('users');

    const ordersCollection = client.db('db-collections').collection('orders');

    const paymentCollection = client
      .db('db-collections')
      .collection('payments');

    const reviewsCollection = client.db('db-collections').collection('reviews');

    // payment
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        payment_method_types: ['card'],
      });

      res.send({ clientSecret: paymentIntent.client_secret });
    });

    // user api
    app.get('/users', verifyJwt, async (req, res) => {
      const result = await usersCollection.find().toArray();

      res.send(result);
    });

    // user api by email
    app.get('/user/:email', async (req, res) => {
      const email = req.params.email;
      const filter = { email };
      const result = await usersCollection.findOne(filter);

      res.send(result);
    });

    // user post api
    app.put('/users/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;

      const filter = { email };
      const option = { upsert: true };

      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(filter, updateDoc, option);

      const accessToken = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1d',
      });

      res.send({ result, accessToken });
    });

    // make admin post api
    app.put('/users/admin/:email', verifyJwt, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await usersCollection.findOne({
        email: requester,
      });

      if (requesterAccount.role === 'admin') {
        const filter = { email };
        const updatedDoc = {
          $set: { role: 'admin' },
        };
        const result = await usersCollection.updateOne(filter, updatedDoc);

        res.send(result);
      } else {
        res.status(403).send({ message: 'Request Forbidden' });
      }
    });

    // Parts Post APi
    app.post('/part', verifyJwt, async (req, res) => {
      const parts = req.body;
      const result = await partsCollection.insertOne(parts);

      res.send(result);
    });

    // Parts APi
    app.get('/parts', async (req, res) => {
      const result = await partsCollection.find().toArray();

      res.send(result);
    });

    // single parts api
    app.get('/parts/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await partsCollection.findOne(filter);

      res.send(result);
    });

    // delete parts api
    app.delete('/part/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await partsCollection.deleteOne(filter);

      res.send(result);
    });

    // post order data form client
    app.post('/orders', verifyJwt, async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);

      res.send(result);
    });

    // orders api
    app.get('/order', verifyJwt, async (req, res) => {
      const result = await ordersCollection.find().toArray();

      res.send(result);
    });

    // orders api by id
    app.get('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await ordersCollection.findOne(filter);

      res.send(result);
    });

    // orders api by user
    app.get('/orders', verifyJwt, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;

      if (email === decodedEmail) {
        const filter = { email };
        const result = await ordersCollection.find(filter).toArray();
        return res.send(result);
      } else {
        return res.status(403).send({ message: 'Forbidden Access' });
      }
    });

    // order paid
    app.patch('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const updatedOrder = await ordersCollection.updateOne(filter, updatedDoc);
      const result = await paymentCollection.insertOne(payment);

      res.send(updatedOrder);
    });

    // update order status api
    app.patch('/order/:id', verifyJwt, async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: ObjectId(id) };

      const updatedDoc = {
        $set: {
          status: data.status,
        },
      };

      const updatedOrder = await ordersCollection.updateOne(filter, updatedDoc);

      res.send(updatedOrder);
    });

    // delete order
    app.delete('/order', async (req, res) => {
      const id = req.query.id;
      const filter = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(filter);

      res.send(result);
    });

    // reviews post api
    app.post('/reviews', async (req, res) => {
      const reviews = req.body;
      const result = await reviewsCollection.insertOne(reviews);

      res.send(result);
    });

    // reviews api
    app.get('/review', async (req, res) => {
      const result = await reviewsCollection.find().toArray();

      res.send(result);
    });

    // root api
    app.get('/', (req, res) => {
      res.send('Welcome to car shifter server');
    });

    app.listen(port, () => {
      console.log('Car shifter server is running');
    });
  } finally {
  }
};

run().catch(console.dir);
