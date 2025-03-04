# Self Service Report Generation

## Author: Fadjar Tandabawana
## Date: 2025-03-05

# Project Structure
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