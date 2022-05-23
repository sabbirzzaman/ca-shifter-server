const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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

const run = async () => {
    await client.connect();

    try {
        const partsCollection = client.db('db-collections').collection('parts');

        const ordersCollection = client
            .db('db-collections')
            .collection('orders');

        const paymentCollection = client
            .db('db-collections')
            .collection('payments');

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

        // post order data form client
        app.post('/orders', async (req, res) => {
            const order = req.body;

            const result = await ordersCollection.insertOne(order);
            res.send(result);
        });

        // orders api
        app.get('/orders', async (req, res) => {
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
        app.get('/orders', async (req, res) => {
            const email = req.query.email;
            const filter = { email };
            const result = await ordersCollection.find(filter).toArray();

            res.send(result);
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
            const updatedOrder = await ordersCollection.updateOne(
                filter,
                updatedDoc
            );
            const result = await paymentCollection.insertOne(payment);

            res.send(updatedOrder);
        });

        // delete order
        app.delete('/order', async (req, res) => {
            const id = req.query.id;
            const filter = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(filter);

            res.send(result);
        });
    } finally {
    }
};

run().catch(console.dir);

// root api
app.get('/', (req, res) => {
    res.send('Welcome to car shifter server');
});

app.listen(port, () => {
    console.log('Car shifter server is running');
});
