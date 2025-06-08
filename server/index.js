import connectDB from './src/db/index.js'
import dotenv from 'dotenv';
import { app } from './src/app.js';

dotenv.config({
  path: '.env'
});

const port = 5000;

connectDB().then(
  app.listen( port , () => {
    console.log(`Example app listening on port ${ port}`)
  })
).catch((error)=>{
  console.error("MONGO Connection ERROR", error);
});


