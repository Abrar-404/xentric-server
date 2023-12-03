const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:5000'],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    optionsSuccessStatus: 204,
    exposedHeaders: ['Access-Control-Allow-Headers'],
  })
);
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

    const couponCollection = client.db('xenricDB').collection('coupons');

    const addProductsCollection = client
      .db('xenricDB')
      .collection('addProducts');

    // const userCollection = client.db('xenricDB').collection('users');

    const allItemCollection = client.db('xenricDB').collection('allItem');

    // users, admin and moderator related
    const usersCollection = client.db('xenricDB').collection('users');

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
      const user = await usersCollection.findOne(query);
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

    // all products for moderator----------------------------
    app.get('/allProducts', async (req, res) => {
      const result = await myProductsCollection.find().toArray();
      res.send(result);
    });

    app.get('/allProducts/:id', async (req, res) => {
      const id = req.params.id;
      console.log('product id', id);
      const query = { _id: new ObjectId(id) };
      const result = await myProductsCollection.findOne(query);
      res.send(result);
    });

    app.get('/myProducts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await myProductsCollection.findOne(query);
      res.send(result);
    });

    app.post('/myProducts', async (req, res) => {
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

    app.get('/allItem', async (req, res) => {
      try {
        const cursor = allItemCollection.find();
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error('Error fetching all items:', error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });

    // Updated /allItem endpoint for search by tag and name
    // Updated /allItem endpoint for search by tag and name
    app.get('/allItem', async (req, res) => {
      try {
        const { searchQuery, tags } = req.query;
        console.log('Received searchQuery:', searchQuery);
        console.log('Received tags:', tags);

        let filter = {};

        // Apply search query if provided
        if (searchQuery) {
          filter.name = { $regex: new RegExp(searchQuery, 'i') };
        }

        // Apply tag filter if provided
        if (tags) {
          const tagsArray = tags.split(',');
          filter.tag = { $in: tagsArray };
        }

        const result = await allItemCollection.find(filter).toArray();

        res.send(result);
      } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });

    app.get('/allItem', async (req, res) => {
      try {
        const { searchQuery, tags } = req.query;
        console.log('Received searchQuery:', searchQuery);
        console.log('Received tags:', tags);

        let filter = {};

        // Apply search query if provided
        if (searchQuery) {
          filter.name = { $regex: new RegExp(searchQuery, 'i') };
        }

        // Apply tag filter if provided
        if (tags) {
          const tagsArray = tags.split(',');
          filter['tags.product'] = { $in: tagsArray };
        }

        const result = await allItemCollection.find(filter).toArray();

        res.send(result);
      } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
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

    // users, moderator, admin related api---------------------------------
    app.get('/users', async (req, res) => {
      console.log(req.headers);
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get('/user/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'Unauthorized Access' });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    });

    app.get('/user/moderator/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'Unauthorized Access' });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let moderator = false;
      if (user) {
        moderator = user?.role === 'moderator';
      }
      res.send({ moderator });
    });

    app.get('/users/:email', verifyAdmin, verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exists', insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin',
        },
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch('/users/moderator/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'moderator',
        },
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updatedDoc = {
        $set: {
          role: 'admin',
        },
      };

      try {
        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
      } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });

    app.patch('/users/moderator/:email', async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updatedDoc = {
        $set: {
          role: 'moderator',
        },
      };

      try {
        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
      } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // Coupons related------------------------
    app.get('/coupons', async (req, res) => {
      const result = await couponCollection.find().toArray();
      res.send(result);
    });

    app.post('/coupons', async (req, res) => {
      const productsAdd = req.body;
      console.log(productsAdd);
      const result = await couponCollection.insertOne(productsAdd);
      res.send(result);
    });

    // users, moderator, admin related api---------------------------------

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
