const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const { env } = require('./config/env');
const corsMiddleware = require('./middlewares/cors.middleware');
const errorMiddleware = require('./middlewares/error.middleware');
const notFoundMiddleware = require('./middlewares/not-found.middleware');
const routes = require('./routes');

const app = express();

app.disable('x-powered-by');

app.use(helmet());
app.use(corsMiddleware);
app.use(express.json({ limit: env.requestBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: env.requestBodyLimit }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/', (req, res) => {
  res.json({
    nome: 'Camera Web Backend',
    versao: '0.1.0',
    status: 'online',
    endpoints: {
      health: `${env.apiPrefix}/health`,
      produtos: `${env.apiPrefix}/produtos`,
    },
  });
});

app.use(env.apiPrefix, routes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
