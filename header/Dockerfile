FROM node

COPY package.json .
RUN npm install
copy . .

RUN npm run build
RUN npm run transpile

CMD PORT=$PORT npm run start:prod
