const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

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
