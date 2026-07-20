# MySQL connection configuration

Configure the database in `server/.env`. This file is ignored by Git, so do not put credentials in source code or commits.

Replace `DB-USERNAME` and `DB-PASSWORD` in this line with the account you create for the Tencent Cloud instance:

```dotenv
DATABASE_URL=mysql://DB-USERNAME:DB-PASSWORD@sh-cynosdbmysql-grp-mavu3pdo.sql.tencentcdb.com:22025/cloud1-d4g11jwpy015d4066
```

If the password contains URL-reserved characters such as `@`, `:`, `/`, `?`, `#`, `%`, or `&`, URL-encode it before putting it in `DATABASE_URL`. For example, `p@ss:word` becomes `p%40ss%3Aword`.

Run the following commands after saving the configuration:

```powershell
npm run db:init
npm run server
```

`npm run db:init` creates the `question` table and its indexes. The database must allow inbound access from the machine running this server; add its public IP address to the Tencent Cloud instance whitelist if the connection is rejected.
