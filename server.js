/*
Main application entry point
 */

// pull in the package json
var pjson = require('./package.json');
console.log('tagchief service version: ' + pjson.version);

// REQUIRE SECTION
var express = require('express'),
    config = require('config'),
    app = express(),
    passport = require('passport'),
    routes = require('./controllers/routes'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    methodOverride = require('method-override'),
    bodyParser = require('body-parser'),
    session = require('express-session'),
    compress = require('compression'),
    errors = require('./lib/errors'),
    crashProtector = require('common-errors').middleware.crashProtector,
    helpers = require('view-helpers'),
    lingua = require('lingua'),
    url = require('url'),
    RedisStore = require('connect-redis')(session);


// set version
app.set('version', pjson.version);

// port
var port = process.env.PORT || 3333;


function afterResourceFilesLoad() {

    console.log('configuring application, please wait...');


    // console.log('Loading ' + 'passport'.inverse + ' config...');
    require('./lib/auth/passport.js')(passport);

    app.set('showStackError', true);

    console.log('Enabling crash protector...');
    app.use(crashProtector());

    console.log('Enabling error handling...');
    app.use(errors.init());

    // make everything in the public folder publicly accessible - do this high up as possible
    app.use(express.static(__dirname + '/public'));
    app.use(express.static(__dirname + '/assets'));

    // set compression on responses
    app.use(compress({
      filter: function (req, res) {
        return /json|text|javascript|css/.test(res.getHeader('Content-Type'));
      },
      level: 9
    }));

    // efficient favicon return - will enable when we have a favicon
    // app.use(favicon('public/images/favicon.ico'));


    app.locals.layout = false;
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');

    // set logging level - dev for now, later change for production
    app.use(logger('dev'));

    // Lingua configuration
    app.use(lingua(app, {
        defaultLocale: 'en',
        path: __dirname + '/i18n'
    }));

    // expose package.json to views
    app.use(function (req, res, next) {
      res.locals.pkg = pjson;
      next();
    });

    // signed cookies
    app.use(cookieParser(config.express.secret));

    app.use(bodyParser.urlencoded({
      extended: true
    }));
    app.use(bodyParser.json());

    app.use(methodOverride());

    // setup session management
    console.log('setting up session management, please wait...');
    var REDIS = url.parse(config.REDIS_URL || process.env.REDIS_URL);
    var redis_pass;
    if (REDIS.auth) {
      var REDIS_AUTH = REDIS.auth.split(':');
      redis_pass = REDIS_AUTH[1];
    }
    app.use(session({
        secret: config.express.secret,
        saveUninitialized: true,
        resave: true,
        store: new RedisStore({
            autoReconnect: true,
            url: process.env.REDIS_URL,
            port: REDIS.port,
            host: REDIS.hostname,
            pass: redis_pass
        })
    }));


    //Initialize Passport
    app.use(passport.initialize());

    // //enable passport sessions
    app.use(passport.session());

    // should be declared after session and flash
    app.use(helpers(pjson.name));

    // set our default view engine
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');


    //pass in the app config params in to locals
    app.use(function(req, res, next) {

        res.locals.app = config.app;
        next();

    });


    // test route - before anything else
    console.log('setting up test route /routetest');

    app.route('/routetest')
    .get(function(req, res) {
        res.send('TagChief Server is running');
    });

    // test route - before anything else
    console.log('setting up ping route /ping');

    app.route('/ping')
    .get(function(req, res) {
        res.send('ready');
    });


    // our routes
    console.log('setting up routes, please wait...');
    routes(app);


    // assume "not found" in the error msgs
    // is a 404. this is somewhat silly, but
    // valid, you can do whatever you like, set
    // properties, use instanceof etc.
    app.use(function(err, req, res, next){
      // treat as 404
      if  ( err.message &&
          (~err.message.indexOf('not found') ||
          (~err.message.indexOf('Cast to ObjectId failed'))
          )) {
        return next();
      }

      // log it
      // send emails if you want
      console.error(err.stack);

      // error page
      if (err.code) {
        res.status(400).json({
          url: req.originalUrl,
          error: err.name,
          code: err.code
        });
      } else {
        res.status(500).json({
          url: req.originalUrl,
          error: err.message,
          stack: err.stack
        });
      }
    });

    // assume 404 since no middleware responded
    app.use(function(req, res){
      if (req.xhr) {
        res.status(404).json({message: 'resource not found'});
      } else {
        res.status(404).json( {
          url: req.originalUrl,
          error: 'Not found'
        });
      }

    });

}


console.log('Running Environment: %s', process.env.NODE_ENV);

console.log('Setting up database communication...');
// setup database connection
require('./lib/db').open()
.then(function () {
  console.log('Database Connection open...');
  //load resource
  afterResourceFilesLoad();

  // actual application start
  app.listen(port);
  console.log('Tag Chief Service started on port '+port);
  // CATASTROPHIC ERROR
  app.use(function(err, req, res){

    console.error(err.stack);

    // make this a nicer error later
    res.status(500).send('Ewww! Something got broken on TagChief. Getting some tape and glue');

  });
})
.catch(function (e) {

  console.log(e.stack);
});




