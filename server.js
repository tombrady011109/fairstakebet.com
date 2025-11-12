const express = require("express");
const cors = require("cors");
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const routeManager = require('./routes/route.manager.js')
const { createsocket } = require("./socket/index.js");
const { createServer } = require("node:http");

require("dotenv").config();
// ============ Initilize the app ========================
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(cors({
  // origin: ["http://localhost:5173", "http://localhost:3000", "https://fairstakebet.com", "https://www.fairstakebet.com", "https://admin.fairstakebet.com"]
  origin: '*'
}));

const server = createServer(app);
async function main() {
  createsocket(server);
}
main();

// application routes
routeManager(app)

app.get("/", (req, res) => {
  res.send("Welcome to fairstakebet backend server");
})

app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).json({
    status: false,
    code: 500,
    error: `Can't find ${err.stack}`
  });
});

// 404 handler
app.use(function (req, res, next) {
  res.status(404).json({
    status: false,
    code: 404,
    error: `Can't find ${req.originalUrl}`
  });
});


mongoose.set('strictQuery', false);
// const dbUri = `mongodb://127.0.0.1:27017/fairstakebet`;
// const dbUri = `mongodb+srv://highscoreteh:AoUXugCyZEfpBmMx@cluster0.xmpkpjc.mongodb.net/tet?retryWrites=true&w=majority`

// const dbUri = "mongodb+srv://highscoreteh:AoUXugCyZEfpBmMx@cluster0.xmpkpjc.mongodb.net/trynew?retryWrites=true&w=majority&connectTimeoutMS=300000"

// const dbUri = "mongodb+srv://fairstakegaming2:pJCZugGnBJ1vl8sV@cluster0.nwrgrrx.mongodb.net/fairstakebet?retryWrites=true&w=majority&connectTimeoutMS=300000"

// const dbUri = "mongodb+srv://mongodb59:pJCZugGnBJ1vl8sV@cluster0.nktzitv.mongodb.net/fairstakebet?retryWrites=true&w=majority&connectTimeoutMS=300000"
//mongorestore --uri "mongodb+srv://mongodb59:pJCZugGnBJ1vl8sV@cluster0.nktzitv.mongodb.net/" --db 'fairstakebet' ./mongo-backup/trynew

//mongoose.connect(dbUri, { useNewUrlParser: true, useUnifiedTopology: true, serverSelectionTimeoutMS: 5000  })
mongoose.connect(process.env.DB_URI)
  .then(async (result) => {
    console.log('Database connected');
    const collections = mongoose.connection.collections;

    for (const collectionName in collections) {
      const collection = collections[collectionName];
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        
        const result = await collection.deleteMany({ createdAt: { $lt: cutoffDate } });
        await collection.dropIndexes({ createdAt: { $lt: cutoffDate } });
        console.log(`🧹 Cleared ${collectionName}: deleted ${result.deletedCount} documents`);
      } catch (err) {
        console.error(`❌ Failed to clear ${collectionName}:`, err.message);
      }
    }
    console.log(`Deleted documents`);
  })
  .catch((err) => console.log("Database failed to connect", err))


const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log("Running on port " + PORT);
});
