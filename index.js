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
    const orderCollection = client.db("CarZilla").collection("orderCollection");
    const testDriveRequest = client
      .db("CarZilla")
      .collection("testDriveRequest");
    // ------------All Products-----------------
    app.get("/products", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });
    // ------------Post A Products-----------------
    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });
    // ------------Delete A Products-----------------
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id
      const query={_id: new ObjectId(id)}
      const result = await productCollection.deleteOne(query)
      res.send(result);
    });
    app.put("/products/:id", async (req, res) => {
      const id = req.params.id
      const updateCar=req.body
      const updateDoc={
        $set:{...updateCar}
      }
      const query={_id: new ObjectId(id)}
      const result = await productCollection.updateOne(query,updateDoc)
      res.send(result);
    });
    // ------------Pagination-----------------
    app.get("/allProducts", async (req, res) => {
      const limit = Number(req.query.limit);
      const sort = req.query.sort;
      const search = req.query.search;
      const query = {
        name: { $regex: search, $options: "i" },
      };

      const pageNo = Number(req.query.pageNo) - 1;
      let sortOption = {};
      if (sort === "asc") {
        sortOption.price = +1;
      }
      if (sort === "dec") {
        sortOption.price = -1;
      }

      const result = await productCollection
        .find(query)
        .skip(limit * pageNo)
        .limit(limit)
        .sort(sortOption)

        .toArray();

      res.send(result);
    });
    //-------------SingleProduct------------------
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });
    //-------------Post a Cart Item --------------
    app.post("/cart", async (req, res) => {
      const cartItem = req.body;

      const email = req.body.email;
      const id = req.body.item;

      const query = {
        email: email,
        item: id,
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
    //------------Get Cart Items By Email------------
    app.get("/cart/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const cartItems = await cartCollection.find(query).toArray();
      const cartIds = cartItems.map((item) => new ObjectId(item.item));
      const query2 = { _id: { $in: cartIds } };
      const result = await productCollection.find(query2).toArray();

      res.send(result);
    });

    //--------------Delete A Cart Item By Id---------

    app.delete("/cart/:id", async (req, res) => {
      const id = req.params.id;
      const email = req.query.email;
      console.log(id);
      const query = { item: id, email: email };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // ----post a order------------

    app.post("/order", async (req, res) => {
      const order = req.body;
      const { orderItem, buyerInfo } = order;
      const email = buyerInfo.email;
      const itemIds = orderItem.map((card) => {
        return card.itemId;
      });

      if (!email || !orderItem.length) {
        return res.status(400).send({ error: "Invalid order data" });
      }

      const deleteQuery = {
        email: email,
        item: {
          $in: itemIds,
        },
      };

      await cartCollection.deleteMany(deleteQuery);
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    //----------------Drive Booking-----------

    app.post("/testDrive", async (req, res) => {
      const driveRequest = req.body;
      const query = {
        email: driveRequest.email,
        productId: driveRequest.productId,
      };

      const isExit = await testDriveRequest.findOne(query);
      if (isExit) {
        return res.send({ isExit: true });
      }

      const result = await testDriveRequest.insertOne(driveRequest);
      res.send(result);
    });

    app.get("/testDrive", async (req, res) => {
      const result = await testDriveRequest.find().toArray();
      res.send(result);
    });
    app.get("/testDrive/:email", async (req, res) => {
      const email=req.params.email
      const query={email:email}
      const result = await testDriveRequest.find(query).toArray();
      res.send(result);
    });

    app.get("/productCount", async (req, res) => {
      const search = req.query.search;
      
      const query = {
        name: { $regex: search, $options: "i" },
      };
      const result = await productCollection.countDocuments(query);
      console.log(result);
      res.send(result);
    });


    app.get('/totalRevenue',async(req,res)=>{
      const[{total}]= await orderCollection.aggregate(
        [
        {
          $group:{
            _id:null,
            total:{$sum:'$total'}
          }
        }
      ]
      ).toArray()
      res.send({totalRevenue:total })
    })




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
