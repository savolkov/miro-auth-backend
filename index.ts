import express, { Application, Request, Response } from 'express';
import axios from 'axios';

const app: Application = express();
const port = process.env.PORT || 3000;

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
  /* eslint-enable */
  res.send(`Copy following value: ${figmaResponse.data.access_token}`);
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
