FROM node:21-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY src ./src
EXPOSE 8080
CMD ["node", "src/index.js"]
