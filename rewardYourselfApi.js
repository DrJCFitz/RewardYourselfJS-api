var express = require('express');
var http = require('http');
var path = require('path');
var mongodb = require('mongodb');
var portnumber = 3000;

var app = express();
var server = new mongodb.Server("127.0.0.1", 27017, {});
var db = new mongodb.Db('merchant', server, {w: 1});

var collection;
db.open(function (error, client) {
    //export the client and maybe some collections as a shortcut
      if ( !error ) {
          console.log('connected to db');
      }
      collection = db.collection("merchant");
});
    
app.get('/stores', function(req, res) {
    if ( Object.keys(req.query).length === 1 && req.query.type !== undefined ) {
    	collection.aggregate([{$match:{type: req.query.type, enabled: true}},{$sort:{key:-1}},{$group:{_id:'$key','name':{$addToSet:'$name'},count: { $sum: 1 }, type:{$addToSet:'$type'} }}],function(err, foundMerchant){
            res.setHeader('Access-Control-Allow-Origin','*');
            res.send({stores:foundMerchant});
        });
    } else if (Object.keys(req.query).length === 2 && 
               (req.query.top !== undefined && req.query.type !== undefined)) {
//	console.log('top requested');
        collection.aggregate([{$match:{type: req.query.type, "reward.rate":{"$ne":"$"}, enabled: true }},{$match:{"reward.rate":{"$ne":""}}},{$group:{_id:"$key", name:{$addToSet:"$name"}, type:{$addToSet:'$type'}, equivalentPercentage:{ $max: { $multiply:["$reward.equivalentPercentage", "$reward.value"]}}}},{$sort:{"equivalentPercentage":-1}},{$limit:20}],function(err, topMerchants){
            res.setHeader('Access-Control-Allow-Origin','*');
            res.send({stores:topMerchants});
        });
    } else {
        var queryParams = req.query;
        // cast the enabled query parameter to a Boolean
        if ( queryParams.enabled !== undefined ) {
            queryParams.enabled = (Boolean)(queryParams.enabled);
        }
        collection.find(req.query).toArray(function(err, selected){
            res.setHeader('Access-Control-Allow-Origin','*');
            res.json({stores:selected});
        });
    }
});

app.listen(portnumber);
