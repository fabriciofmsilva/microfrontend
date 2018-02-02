const express = require('express');
const request = require('request');

const server = express();

server.set('view engine', 'ejs');

server.get('/', (req, res) =>
  Promise
    .all([
      getContents('https://microfrontends-header.herokuapp.com/'),
      getContents('https://microfrontends-products-list.herokuapp.com/'),
      getContents('https://microfrontends-cart.herokuapp.com/')
    ])
    .then(responses =>
      res.render('index', { header: responses[0], productsList: responses[1], cart: responses[2] })
    )
    .catch(error =>
      res.send(error.message)
    )
);


server.get('/iframe', (req, res) =>
  res.render('iframe')
);

const getContents = (url) => new Promise((resolve, reject) => {
  request.get(url, (error, response, body) => {
    if (error) return resolve("Error loading " + url + ": " + error.message);

    return resolve(body);
  });
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log(`Homepage listening on port ${port}`);
});
