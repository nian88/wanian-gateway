FROM node:12.10.0

#ENV NODE_ENV=production

WORKDIR /usr/src/app

COPY package.json .

RUN npm install

COPY . .

EXPOSE 3000

CMD [ "node", "app.js" ]