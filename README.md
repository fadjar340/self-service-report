# Self Service Report Generation


Web application for user to generate report that already predefined query

## Project Structure
```markdown
self-service-app/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminDatabases.js
│   │   │   ├── UserQueries.js
│   │   │   ├── Login.js
│   │   │   └── App.js
│   │   ├── styles.css
│   │   └── index.js
│   └── package.json
├── server/
│   ├── config/
│   ├── middleware/
│   │   ├── auth.js
│   │   └── role.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── database.js
│   │   └── query.js
│   ├── services/
│   │   └── db.js
│   ├── app.js
│   ├── Dockerfile
│   └── package.json
├── kubernetes/
│   ├── deployment.yaml
│   └── service.yaml
├── docker-compose.yml
├── init-db.sql
├── .env
└── README.md
```

## Installation from source
1. Clone this repository
2. Install dependency using  `npm install` or `yarn install`
3. Modify the .env file to match your environment
4. Run `npm start` or `yarn start` to start the application
5. (Optional) Add Nginx in front of the application and add reverse proxy to the applicion, eg: `localhost:3000`

## Installation using Docker
1. Clone this repository
2. Modify the .env file to match with your environment
3. Run `docker compose up --build` to start the application
4. (Optional) Add Nginx in front of the application and add reverse proxy to the applicion
