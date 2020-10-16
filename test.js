const { Pool, Client } = require('pg')
const pool = new Pool({
  user: 'kamran',
  host: 'bandwidthapi.culvr911itog.us-east-1.rds.amazonaws.com',
  database: 'bandwidthapi',
  password: 'BanDWidthAPI',
  port: 5432,
})
pool.query('SELECT NOW()', (err, res) => {
  console.log(err, res)
  pool.end()
})
const client = new Client({
  user: 'kamran',
  host: 'bandwidthapi.culvr911itog.us-east-1.rds.amazonaws.com',
  database: 'bandwidthapi',
  password: 'BanDWidthAPI',
  port: 5432,
})
client.connect()
client.query('SELECT NOW()', (err, res) => {
  console.log(err, res)
  client.end()
})