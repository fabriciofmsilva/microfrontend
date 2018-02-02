const express = require('express');
const request = require('request');
const proxy = require('http-proxy-middleware');
const ejs = require('ejs');
const padRight = require('pad-right');

const server = express();

server.set('view engine', 'ejs');

// Alternative 1: use the back-end to fetch the other app
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

// Alternative 2: iFrames
server.get('/iframe', (req, res) =>
  res.render('iframe')
);

// Alternative 3: Client-Side JavaScript
const createProxy = (path, target) =>
  server.use(path, proxy({ target, changeOrigin: true, pathRewrite: {[`^${path}`]: ''} }));

createProxy('/header', 'https://microfrontends-header.herokuapp.com/');
createProxy('/products-list', 'https://microfrontends-products-list.herokuapp.com/');
createProxy('/cart', 'https://microfrontends-cart.herokuapp.com/');

server.get('/client', (req, res) => res.render('client'));

// Alternative 4: Progressive loading from the back-end
server.get('/progressive', (req, res) => {
  let appsToLoad = [
    { name: 'header', url: 'https://microfrontends-header.herokuapp.com/' },
    { name: 'productsList', url: 'https://microfrontends-products-list.herokuapp.com/' },
    { name: 'cart', url: 'https://microfrontends-cart.herokuapp.com/' }
  ]
  let previousFlushedData = '';

  const load = (piece, index) =>
    getContents(piece.url).then(data => {
      appsToLoad[index].data = data;
      flushData();
    });

  const buildDataForEjs = () =>
    appsToLoad.reduce((params, app) => {
      params[app.name] = app.data || 'PENDING';
      return params;
    }, {});

  const flushData = () => {
    const dataForEjs = buildDataForEjs();
    ejs.renderFile('views/progressive.ejs', dataForEjs, {}, (err, renderedHtml) => {
      if (err) throw err;

      const htmlToBeFlushed = renderedHtml.split('PENDING')[0].replace(previousFlushedData, '');

      // chunks have to have at least 4096 bytes to make sure browsers print them
      res.write(padRight(htmlToBeFlushed, 4096, ' '));
      previousFlushedData += htmlToBeFlushed;
    });
  }

  flushData();
  Promise.all(
    appsToLoad.map(load)
  ).then(() =>
    res.end()
  );
});

// Alternative 5: WebComponents

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
