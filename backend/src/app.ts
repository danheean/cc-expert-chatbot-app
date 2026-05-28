import express from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import apiRouter from './routes/index';

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use('/api', apiRouter);

app.use(errorHandler);

export default app;
