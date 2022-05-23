const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

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

        app.get('/parts', async (req, res) => {
            const result = await partsCollection.find().toArray();
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
