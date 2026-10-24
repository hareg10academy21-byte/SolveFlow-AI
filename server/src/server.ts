import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/database.js';

const port = Number(process.env.PORT ?? 5000);
const mongoUri = process.env.MONGODB_URI;

async function startServer(): Promise<void> {
  if (mongoUri) {
    await connectDatabase(mongoUri);
  } else {
    console.warn('MONGODB_URI is not set; starting API without a database connection.');
  }

  app.listen(port, () => {
    console.log(`SolveFlow AI API listening on http://localhost:${port}`);
  });
}

startServer().catch((error: unknown) => {
  console.error('Unable to start server:', error);
  process.exit(1);
});
