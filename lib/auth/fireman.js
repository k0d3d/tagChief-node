var admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert("tcmfb.json"),
  databaseURL: "https://tagchief-matrix-843.firebaseio.com"
});

module.exports = function() {
  return function(req, res, next) {
    admin.auth().verifyIdToken(req.headers.authorization)
      .then(function(decodedToken) {
        req.user = decodedToken;
        // TODO:: this is scotch tape
        req.user._id = decodedToken.uid;
        next();
      }).catch(function(error) {
        next(error);
      });
  };
};
