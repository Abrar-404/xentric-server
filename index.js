const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eted0lc.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const featureCardCollection = client
      .db('xenricDB')
      .collection('featureCards');

    const trendingCardCollection = client
      .db('xenricDB')
      .collection('trendingCards');

    const myProductsCollection = client.db('xenricDB').collection('myProducts');

    const addProductsCollection = client
      .db('xenricDB')
      .collection('addProducts');

    const userCollection = client.db('xenricDB').collection('users');

    const allItemCollection = client.db('xenricDB').collection('allItem');

    // own middleware
    const verifyToken = (req, res, next) => {
      console.log(req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Forbidden Access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: 'Forbidden Access' });
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'Unauthorized Access' });
      }
      next();
    };

    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h',
      });
      res.send({ token });
    });

    // feature cards on home related---------------
    app.get('/featureCards', async (req, res) => {
      const cursor = featureCardCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/featureCards/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await featureCardCollection.findOne(query);
      res.send(result);
    });

    // trending cards related---------------
    app.get('/trendingCards', async (req, res) => {
      const cursor = trendingCardCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/trendingCards/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await trendingCardCollection.findOne(query);
      res.send(result);
    });

    // products add related
    app.get('/myProducts', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await myProductsCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/myProducts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await myProductsCollection.findOne(query);
      res.send(result);
    });

    app.post('/myProducts', verifyToken, async (req, res) => {
      const productsAdd = req.body;
      console.log(productsAdd);
      const result = await myProductsCollection.insertOne(productsAdd);
      res.send(result);
    });

    app.patch('/myProducts/:id', async (req, res) => {
      const item = req.body;
      console.log(item);
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const option = {
        upsert: true,
      };
      const updatedDoc = {
        $set: {
          name: item.name,
          description: item.description,
          price: item.price,
          img: item.img,
        },
      };
      const result = await myProductsCollection.updateOne(
        filter,
        updatedDoc,
        option
      );
      res.send(result);
    });

    app.delete('/myProducts/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await myProductsCollection.deleteOne(query);
      res.send(result);
    });

    app.post('/addProducts', verifyToken, async (req, res) => {
      const addProduct = req.body;
      console.log(addProduct);
      const result = await addProductsCollection.insertOne(addProduct);
      res.send(result);
    });

    // all Item page
    app.get('/allItem', async (req, res) => {
      const cursor = allItemCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post('/allItem', verifyToken, async (req, res) => {
      const productsAdd = req.body;
      console.log(productsAdd);
      const result = await allItemCollection.insertOne(productsAdd);
      res.send(result);
    });

    app.get('/allItem/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await allItemCollection.findOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Tech On Fire');
});

app.listen(port, () => {
  console.log(`Port is running on: ${port}`);
});
