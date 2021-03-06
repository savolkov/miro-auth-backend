import express, { Application, Request, Response } from 'express';
import axios, {AxiosResponse} from 'axios';
import redis from 'redis';
import cors from 'cors';
import { promisify } from 'util';

const redisUrl = process.env.REDIS_URL;
const db = redis.createClient({
  url: redisUrl,
});
const getAsync = promisify(db.get).bind(db);
const setAsync = promisify(db.set).bind(db);
const expireAsync = promisify(db.expire).bind(db);

db.on('error', (err) => { console.log(`Redis error: ${err}`); });
db.on('ready', () => { console.log('Redis is ready'); });

const app: Application = express();
app.use(cors());
const port = process.env.PORT || 3000;

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
  let figmaResponse: AxiosResponse;
  try {
    figmaResponse = await axios.post(
      'https://www.figma.com/api/oauth/token',
      {
        client_id: process.env.FIGMA_CLIENT_ID,
        client_secret: process.env.FIGMA_CLIENT_SECRET,
        redirect_uri: process.env.FIGMA_REDIRECT_URI,
        code,
        grant_type: 'authorization_code',
      },
    );
  } catch (err) {
    console.error(err);
    return res.status(500).send('Figma server error.');
  }

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
