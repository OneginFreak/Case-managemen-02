FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install -g knex
RUN apt-get update && apt-get install -y postgresql-client
COPY . .
RUN chmod +x wait-for-db.sh
CMD ["./wait-for-db.sh"]
#CMD ["sh", "-c", "npm run migrate && npm start"]|