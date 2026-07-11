FROM node

WORKDIR /gateway

COPY package*.json .
RUN npm install
COPY . .

CMD [ "node", "index.js" ]