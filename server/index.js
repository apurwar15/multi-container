const keys = require('./keys');

// Express Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// postgres setup
const {Pool} = require('pg');

const pgClient = new Pool({
    host : keys.pgHost,
    database: keys.pgDatabase,
    user : keys.pgUser,
    password : keys.pgPassword,
    port : keys.pgPort
})

pgClient.on('connect',()=>{
    pgClient
        .query('CREATE TABLE IF NOT EXISTS VALUES (number INT) ')
        .catch((err) => console.log(err));
})


// redis client setup

const redis = require('redis');

const redisClient = redis.createClient({
    host : keys.redisHost,
    port : keys.redisPort,
    retry_strategy : () => 1000
})


const redisPublisher = redisClient.duplicate();


app.get('/',(req,res)=>{
    res.send('hi');
})

app.get('/values/all',async (req,res)=>{
    const values = await pgClient.query('SELECT * FROM values');
    res.send(values.rows);

})

app.get('/values/current',async (req,res)=>{
    redisClient.hgetall('values',(err,values)=>{
        res.send(values);
    })

})


app.post('/values', async (req,res)=>{
    const index = req.body.index;
    if(parseInt(index)>40){
       return res.status(422).send('Index too high')
    }

    redisClient.hset('values',index,'Nothing Yet!')
    redisPublisher.publish('insert');
    await pgClient.query('INSERT into values(number) VALUES($1)',[index]);
    res.send({working : true})
})

app.listen(5000,()=> console.log(5000));