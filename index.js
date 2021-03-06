// Generated by CoffeeScript 1.6.3
var crypto, mongooseRedisCache, redis, _;

redis = require("redis");

crypto = require("crypto");

_ = require("underscore");

RegExp.prototype.toJSON = function() {
  var ind, json, opts, str;
  json = {
    $regexp: this.source
  };
  str = this.toString();
  ind = str.lastIndexOf('/');
  opts = str.slice(ind + 1);
  if (opts.length > 0) {
    json.$options = opts;
  }
  return json;
};

mongooseRedisCache = function(mongoose, options, callback) {
  var client, host, pass, port, prefix, redisOptions;
  if (options == null) {
    options = {};
  }
  host = options.host || "";
  port = options.port || "";
  pass = options.pass || "";
  redisOptions = options.options || {};
  prefix = options.prefix || "cache";
  mongoose.redisClient = client = redis.createClient(port, host, redisOptions);
  if (pass.length > 0) {
    client.auth(pass, function(err) {
      if (callback) {
        return callback(err);
      }
    });
  }
  mongoose.Query.prototype._execFind = mongoose.Query.prototype.execFind;
  mongoose.Query.prototype.execFind = function(callback) {
    var cb, collectionName, expires, fields, hash, key, model, populate, query, schemaOptions, self;
    self = this;
    model = this.model;
    query = this._conditions || {};
    options = this._optionsForExec(model) || {};
    fields = _.clone(this._fields) || {};
    populate = this.options.populate || {};
    schemaOptions = model.schema.options;
    collectionName = model.collection.name;
    expires = schemaOptions.expires || 60;
    if (!(schemaOptions.redisCache && !options.nocache && options.lean)) {
      return mongoose.Query.prototype._execFind.apply(self, arguments);
    }
    delete options.nocache;
    hash = crypto.createHash('md5').update(JSON.stringify(query)).update(JSON.stringify(options)).update(JSON.stringify(fields)).update(JSON.stringify(populate)).digest('hex');
    key = [prefix, collectionName, hash].join(':');
    cb = function(err, result) {
      var docs, k, path;
      if (err) {
        return callback(err);
      }
      if (!result) {
        for (k in populate) {
          path = populate[k];
          path.options || (path.options = {});
          _.defaults(path.options, {
            nocache: true
          });
        }
        return mongoose.Query.prototype._execFind.call(self, function(err, docs) {
          var str;
          if (err) {
            return callback(err);
          }
          str = JSON.stringify(docs);
          client.setex(key, expires, str);
          return callback(null, docs);
        });
      } else {
        docs = JSON.parse(result);
        return callback(null, docs);
      }
    };
    client.get(key, cb);
    return this;
  };
};

module.exports = mongooseRedisCache;
