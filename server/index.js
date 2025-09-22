require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const moment = require("moment-timezone");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.bx9ca.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    const booksCollection = client.db("benzine_prokashon").collection("books");
    const bannerCollection = client
      .db("benzine_prokashon")
      .collection("banners");
    const userCollection = client.db("benzine_prokashon").collection("users");
    const sellsCollection = client.db("benzine_prokashon").collection("sells");

    // jwt apis

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "8h",
      });
      res.send({ token });
    });

    // middleware for verify jwt

    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "No token provided." });
      }

      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Invalid or expired token." });
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email };

      const user = await userCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ message: "Forbidden access. Admins only." });
      }
      next();
    };

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };

      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    // user apis
    // Get all users (with search)
    // Get all users with optional search and pagination
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        let query = {};
        if (search) {
          query = {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { email: { $regex: search, $options: "i" } },
            ],
          };
        }

        const totalUsers = await userCollection.countDocuments(query);
        const users = await userCollection
          .find(query)
          .sort({ _id: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();

        res.json({ users, totalUsers, page, limit });
      } catch (error) {
        res.status(500).json({ message: "Error fetching users", error });
      }
    });

    app.patch("/users/:id/role", verifyAdmin, async (req, res) => {
      try {
        const { id } = req.params;
        const { role } = req.body;

        // Allowed roles only
        const allowedRoles = ["writer", "admin", "user"];
        if (!allowedRoles.includes(role)) {
          return res.status(400).json({ message: "Invalid role" });
        }

        const result = await userCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { role } }
        );

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .json({ message: "User not found or role unchanged" });
        }

        res.json({ message: "Role updated successfully", role });
      } catch (error) {
        res.status(500).json({ message: "Error updating role", error });
      }
    });
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await userCollection.findOne(query);

      if (user) {
        res.json(user);
      } else {
        res.status(404).json({ message: "User not found" });
      }
    });

    // sells apis

    /**
     * API: Get total sales summary
     * Query: ?period=day | month | year
     */
    // app.get("/sell-items", async (req, res) => {
    //   try {
    //     const { period, page = 1, limit = 20 } = req.query;
    //     const pageNum = parseInt(page, 10);
    //     const pageSize = parseInt(limit, 10);
    //     const skip = (pageNum - 1) * pageSize;

    //     const now = new Date();
    //     let startDate;
    //     if (period === "day")
    //       startDate = new Date(
    //         now.getFullYear(),
    //         now.getMonth(),
    //         now.getDate()
    //       );
    //     else if (period === "month")
    //       startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    //     else if (period === "year")
    //       startDate = new Date(now.getFullYear(), 0, 1);
    //     else return res.status(400).json({ message: "Invalid period" });

    //     const pipeline = [
    //       { $match: { createdAt: { $gte: startDate } } },
    //       { $unwind: "$items" },
    //       // cast if your quantity/total are stored as strings
    //       {
    //         $addFields: {
    //           "items.quantity": { $toInt: "$items.quantity" },
    //           "items.total": { $toDouble: "$items.total" },
    //         },
    //       },
    //       { $sort: { createdAt: -1, _id: -1 } },
    //       {
    //         $facet: {
    //           rows: [
    //             { $skip: skip },
    //             { $limit: pageSize },
    //             {
    //               $project: {
    //                 _id: 0,
    //                 invoice: "$_id",
    //                 createdAt: 1,
    //                 role: 1,
    //                 sellerName: 1,
    //                 sellerEmail: 1,
    //                 bookId: "$items.bookId",
    //                 bookName: "$items.bookName",
    //                 quantity: "$items.quantity",
    //                 total: "$items.total",
    //               },
    //             },
    //           ],
    //           totalCount: [{ $count: "count" }],
    //         },
    //       },
    //       {
    //         $project: {
    //           rows: 1,
    //           totalCount: {
    //             $ifNull: [{ $arrayElemAt: ["$totalCount.count", 0] }, 0],
    //           },
    //         },
    //       },
    //     ];

    //     const [out] = await sellsCollection.aggregate(pipeline).toArray();
    //     res.json(out); // { rows: [...], totalCount: number }
    //   } catch (error) {
    //     console.error("Error fetching sell-items:", error);
    //     res.status(500).json({ message: "Internal server error" });
    //   }
    // });

    // Convert UTC → BD time

    function getBDStartOfDay(date = new Date()) {
      return moment.tz(date, "Asia/Dhaka").startOf("day").toDate();
    }

    function getBDEndOfDay(date = new Date()) {
      return moment.tz(date, "Asia/Dhaka").endOf("day").toDate();
    }

    function getBDStartOfMonth(date = new Date()) {
      return moment.tz(date, "Asia/Dhaka").startOf("month").toDate();
    }

    function getBDEndOfMonth(date = new Date()) {
      return moment.tz(date, "Asia/Dhaka").endOf("month").toDate();
    }

    function getBDStartOfYear(date = new Date()) {
      return moment.tz(date, "Asia/Dhaka").startOf("year").toDate();
    }

    function getBDEndOfYear(date = new Date()) {
      return moment.tz(date, "Asia/Dhaka").endOf("year").toDate();
    }
    // ==========================
    // API
    // ==========================
    app.get("/sell-items", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const {
          period = "day",
          page = 1,
          limit = 20,
          sellerEmail,
          startDate,
          endDate,
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const pageLimit = parseInt(limit);

        const filter = {};
        if (sellerEmail) {
          filter.sellerEmail = sellerEmail;
        }

        const now = new Date();

        if (period === "day") {
          filter.createdAt = {
            $gte: getBDStartOfDay(now),
            $lt: getBDEndOfDay(now),
          };
        } else if (period === "month") {
          filter.createdAt = {
            $gte: getBDStartOfMonth(now),
            $lt: getBDEndOfMonth(now),
          };
        } else if (period === "year") {
          filter.createdAt = {
            $gte: getBDStartOfYear(now),
            $lt: getBDEndOfYear(now),
          };
        } else if (period === "custom" && startDate && endDate) {
          const bdStart = getBDStartOfDay(new Date(startDate));
          const bdEnd = getBDEndOfDay(new Date(endDate));
          filter.createdAt = { $gte: bdStart, $lte: bdEnd };
        }

        const totalCount = await sellsCollection.countDocuments(filter);

        const rows = await sellsCollection
          .find(filter)
          .skip(skip)
          .limit(pageLimit)
          .sort({ createdAt: -1 })
          .toArray();

        res.json({
          rows,
          totalCount,
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / pageLimit),
        });
      } catch (error) {
        console.error("Error fetching sell items:", error);
        res.status(500).json({ message: "Server error" });
      }
    });

    app.post("/sales", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const sales = req.body;
        sales.createdAt = new Date();

        const result = await sellsCollection.insertOne(sales);

        // 2. Update stock for each sold book
        const updatePromises = (sales.items || []).map((item) => {
          const quantitySold = Number(item.quantity || 0);
          return booksCollection.updateOne(
            { _id: new ObjectId(item.bookId) },
            { $inc: { stock: -quantitySold } } // decrease stock
          );
        });

        await Promise.all(updatePromises);
        res.send(result);
      } catch (error) {
        console.error("Error inserting sales:", error);
        res.status(500).send({ error: "Failed to add sales" });
      }
    });

    /**
     * API: Get sales summary for specific book
     * Example: /api/sales/book/68a85b494ca55e7c8edca0a7?period=month
     */

    app.get("/sales/books", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const { period, startDate, endDate } = req.query;

        let start, end;

        if (startDate && endDate) {
          // Custom range
          start = getBDStartOfDay(new Date(startDate));
          end = getBDEndOfDay(new Date(endDate));
        } else {
          const now = new Date();

          if (period === "day") {
            start = getBDStartOfDay(now);
            end = getBDEndOfDay(now);
          } else if (period === "month") {
            start = getBDStartOfMonth(now);
            end = getBDEndOfMonth(now);
          } else if (period === "year") {
            start = getBDStartOfYear(now);
            end = getBDEndOfYear(now);
          } else {
            return res.status(400).json({ message: "Invalid period" });
          }
        }

        const pipeline = [
          { $match: { createdAt: { $gte: start, $lte: end } } },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.bookId",
              bookName: { $first: "$items.bookName" },
              totalSalesAmount: { $sum: { $toDouble: "$items.total" } },
              totalQuantity: { $sum: { $toInt: "$items.quantity" } },
              orderCount: { $sum: 1 },
              dates: { $addToSet: "$createdAt" },
            },
          },
          { $sort: { totalSalesAmount: -1 } },
        ];

        const result = await sellsCollection.aggregate(pipeline).toArray();
        res.json(result);
      } catch (error) {
        console.error("Error fetching book sales:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    /**
     * API: Get sales by specific seller or customer
     * Example: /api/sales/seller/cosuwobaso@mailinator.com
     */
    app.get(
      "/sales/seller/:email",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const { email } = req.params;

          const sales = await sellsCollection
            .find({ sellerEmail: email })
            .toArray();

          res.json(sales);
        } catch (error) {
          console.error("Error fetching seller sales:", error);
          res.status(500).json({ message: "Internal server error" });
        }
      }
    );

    // banner manager

    app.get("/banners", async (req, res) => {
      try {
        let banner = await bannerCollection.findOne({});

        if (!banner) {
          const defaultBanner = {
            main: [],
          };
          await bannerCollection.insertOne(defaultBanner);
          banner = defaultBanner;
        } else {
          // Ensure all fields are present
          banner.main = banner.main || [];
        }

        res.json(banner);
      } catch (error) {
        console.error("GET /banners error:", error);
        res.status(500).json({ message: "Server error" });
      }
    });

    app.put("/banners", async (req, res) => {
      try {
        const { main } = req.body;

        // Basic validation
        if (!main || !Array.isArray(main)) {
          return res.status(400).json({ message: "Invalid banner data" });
        }

        const result = await bannerCollection.updateOne(
          {},
          { $set: { main } },
          { upsert: true }
        );

        res.json({ message: "Banner updated successfully" });
      } catch (error) {
        console.error("PUT /banners error:", error);
        res.status(500).json({ message: "Server error" });
      }
    });

    // books apis

    app.get("/books/:id", async (req, res) => {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid book ID" });
      }

      try {
        const query = { _id: new ObjectId(id) };
        const book = await booksCollection.findOne(query);

        if (!book) {
          return res.status(404).json({ error: "Book not found" });
        }

        res.json(book);
      } catch (error) {
        console.error("Error fetching book by ID:", error);
        res.status(500).json({ error: "Failed to fetch book" });
      }
    });

    /**
     * PUT update book
     */
    app.put("/books/:id", async (req, res) => {
      try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid book ID" });
        }

        const updatedBook = req.body;

        const updateDoc = {
          $set: {
            productNameBn: updatedBook.productNameBn,
            productNameEn: updatedBook.productNameEn,
            subtitle: updatedBook.subtitle,
            isbn: updatedBook.isbn,
            stock: updatedBook.stock,
            authorName: updatedBook.authorName,
            translatorName: updatedBook.translatorName,
            listPrice: updatedBook.listPrice,
            pages: updatedBook.pages,
            discountType: updatedBook.discountType,
            discountValue: updatedBook.discountValue,
            description: updatedBook.description,
            genres: updatedBook.genres,
            authorEmail: updatedBook.authorEmail,
            updatedBy: updatedBook.updatedBy,
            updatedAt: new Date(updatedBook.updatedAt),
          },
        };

        // only update coverImage if provided
        if (updatedBook.coverImage) {
          updateDoc.$set.coverImage = updatedBook.coverImage;
        }

        // only update bookPdf if provided
        if (updatedBook.bookPdf) {
          updateDoc.$set.bookPdf = updatedBook.bookPdf;
        }

        const result = await booksCollection.updateOne(
          { _id: new ObjectId(id) },
          updateDoc
        );

        res.json(result); // will include matchedCount & modifiedCount
      } catch (err) {
        console.error("Error updating book:", err);
        res.status(500).json({ message: "Failed to update book" });
      }
    });

    // Delete a book
    app.delete("/books/:id", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const id = new ObjectId(req.params.id);
        const result = await booksCollection.deleteOne({ _id: id });
        if (result.deletedCount === 0)
          return res.status(404).json({ message: "Book not found" });
        res.json({ message: "Book deleted successfully" });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });

    app.get("/books", async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const sortBy = req.query.sortBy || "price";
        const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;
        const genre = req.query.genre;

        const skip = (page - 1) * limit;

        // Search condition
        const query = {
          ...(search && {
            $or: [
              { productNameEn: { $regex: search, $options: "i" } },
              { productNameBn: { $regex: search, $options: "i" } },
              { authorName: { $regex: search, $options: "i" } },
              { translatorName: { $regex: search, $options: "i" } },
              { genres: { $regex: search, $options: "i" } },
            ],
          }),
          ...(genre && { genres: genre }),
        };
        const sortField =
          sortBy === "time"
            ? { createdAt: sortOrder }
            : { listPrice: sortOrder };
        // Fetch books
        const cursor = booksCollection
          .find(query)
          .sort(sortField)
          .skip(skip)
          .limit(limit);

        const books = await cursor.toArray();
        const totalBooks = await booksCollection.countDocuments(query);

        res.send({
          books,
          totalBooks,
          totalPages: Math.ceil(totalBooks / limit),
          currentPage: page,
        });
      } catch (error) {
        console.error("Error fetching books:", error); // Debug log
        res.status(500).send({ error: "Failed to fetch books" });
      }
    });
    app.post("/books", async (req, res) => {
      const book = req.body;
      const result = await booksCollection.insertOne(book);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("Hello from Benzine Prokashon Server!");
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
