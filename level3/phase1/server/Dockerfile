FROM node

WORKDIR /appByKJ

COPY package*.json .
RUN npm install
COPY . .

CMD [ "node", "index.js" ]