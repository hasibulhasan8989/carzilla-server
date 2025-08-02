const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = 4000 || process.env.node;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zsgh3ij.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    const productCollection = client
      .db("CarZilla")
      .collection("productCollection");
    const cartCollection = client.db("CarZilla").collection("cartCollection");

    app.get("/products", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });

    app.get("/products/:id", async (req, res) => {
       const id=req.params.id
       const query={_id:new ObjectId(id)}
       const result = await productCollection.findOne(query)
      res.send(result);
    });
    app.post("/cart", async (req, res) => {
      const cartItem = req.body;
      const email = req.body.email;
      const id = req.body.id;

      const query = {
        email: email,
        id: id,
      };

      const isExit = await cartCollection.findOne(query);
      let result = {};

      if (isExit) {
        result = { exist: true };
      }

      if (!isExit) {
        result = await cartCollection.insertOne(cartItem);
      }
      res.send(result);
    });

    app.get("/cart/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const cartItems = await cartCollection.find(query).toArray();
      const cartIds = cartItems.map((item) => new ObjectId(item.item));
      const query2 = { _id: { $in: cartIds } };
      const result = await productCollection.find(query2).toArray();

      res.send(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
