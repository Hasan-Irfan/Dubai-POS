import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { jwtVerify } from './middlewares/authChecker.js';
import { attachAuditContext } from './middlewares/attachAuditContext.js';


dotenv.config({
  path: '.env'
});

export const app = express();

const corsOptions = {
  origin: ["http://localhost:5173", process.env.FRONTEND_URL].filter(Boolean),
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

// Handling preflight requests
app.options("*", cors(corsOptions)); // Enable pre-flight across-the-board with specific options

// Your routes and server setup
app.get("/", (req, res) => {
  res.send("CORS is enabled for all origins!");
});

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json({limit: '16kb'}));
app.use(express.static(process.env.PUBLIC_DIR));
app.use(cookieParser());

//routes imports
import authRouter from './routes/authRoutes.js';
import userRouter from './routes/userRoutes.js';
import employeeRouter from './routes/employeeRoutes.js';
import invoiceRouter from './routes/invoiceRoutes.js';
import advanceRouter from './routes/advanceRoutes.js';
import vendorRouter from './routes/vendorRoutes.js';
import vendorTransactionRouter from './routes/vendorTransactionRoutes.js';
import cashRouter from './routes/cashRoutes.js';
import bankRouter from './routes/bankRoutes.js';
import expenseRouter from './routes/expenseRoutes.js';
import reportRouter from './routes/reportRoutes.js';
import payrollRouter from './routes/payrollRoutes.js';
import auditRouter from './routes/auditRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

//routes declaration
app.use('/api/v1', authRouter);


// Authentication middleware - all routes below require authentication
app.use(jwtVerify);               // Verifies JWT and sets req.user
app.use(attachAuditContext);     // Adds req.auditContext (for audit plugin use)

app.use('/api/v1/users', userRouter);
app.use('/api/v1/employees', employeeRouter);
app.use('/api/v1/invoices', invoiceRouter);
app.use('/api/v1/cash', cashRouter);     // Needed for invoice payment processing
app.use('/api/v1/bank', bankRouter);     // Needed for invoice payment processing
app.use('/api/v1/advances', advanceRouter);
app.use('/api/v1/vendors', vendorRouter);
app.use('/api/v1/vendor-transactions', vendorTransactionRouter);
app.use('/api/v1/expenses', expenseRouter);
app.use('/api/v1/reports', reportRouter);
app.use('/api/v1/payroll', payrollRouter);
app.use('/api/v1/audit', auditRouter);
app.use('/api/dashboard', dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

