import express, { Application, Request, Response } from 'express';
import axios from 'axios';
import redis from 'redis';
import cors from 'cors';
import { promisify } from 'util';

const db = redis.createClient({
  // TODO: move to env
  url: 'redis://h:p69b578075c815bf24fac8acb100296cdc4c342acacfa3cf1166fccb4d24c8d2d@ec2-3-226-148-238.compute-1.amazonaws.com:31599',
});
const getAsync = promisify(db.get).bind(db);
const setAsync = promisify(db.set).bind(db);
const expireAsync = promisify(db.expire).bind(db);

db.on('error', (err) => { console.log(`Redis error: ${err}`); });
db.on('ready', () => { console.log('Redis is ready'); });

const app: Application = express();
app.use(cors());
const port = process.env.PORT || 3000;

// app.post('/preauth', async (req: Request, res: Response) => {
//   if (!req.query.state) {
//     return res.status(500).send('State or was not passed');
//   }
//
//   const { state } = req.query;
//   db.set(state, '');
//   db.expire(state, 600);
//   return res.sendStatus(200);
// });

app.get('/postauth', async (req: Request, res: Response) => {
  if (!req.query.state) {
    return res.status(500).send('State was not passed');
  }

  const { state } = req.query;
  let token;
  try {
    token = await getAsync(state);
  } catch (err) {
    return res.status(500).send('Cache error.');
  }

  if (token === null) {
    return res.sendStatus(404);
  }

  return res.send(`{ "access_token": "${token}" }`);
});

app.get('/oauth', async (req: Request, res: Response) => {
  if (!req.query.code || !req.query.state) {
    return res.status(500).send('Code or state were not passed.');
  }
  const { state } = req.query;
  const { code } = req.query;
  /* eslint-disable @typescript-eslint/camelcase */
  const figmaResponse = await axios.post(
    'https://www.figma.com/api/oauth/token',
    {
      client_id: 'OCNljv8VVPqctvRMUglYVu',
      client_secret: 'qYimyJbKlRfzTYW846N2QFTMCjgxKX',
      redirect_uri: 'https://miro-auth-stage.herokuapp.com/oauth',
      code,
      grant_type: 'authorization_code',
    },
  );
  try {
    await setAsync(state, figmaResponse.data.access_token);
    await expireAsync(state, 600);
  } catch (err) {
    return res.status(500).send('Cache error.');
  }
  /* eslint-enable */
  return res.send('Please return to Miro and press <b>Refresh</b> button.');
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
