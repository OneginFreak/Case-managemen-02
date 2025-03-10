FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN ls -la /app/src
CMD ["sh", "-c", "npm run migrate && npm start"]