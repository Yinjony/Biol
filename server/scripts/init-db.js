const { initDb, pool } = require('../db')

initDb()
  .then(async () => {
    await pool.end()
    console.log('Database schema is ready.')
  })
  .catch(async (error) => {
    await pool.end()
    console.error(error)
    process.exit(1)
  })
