FROM node

WORKDIR /kj2

COPY package*.json .
RUN npm install
COPY . .

CMD [ "node", "index.js" ]