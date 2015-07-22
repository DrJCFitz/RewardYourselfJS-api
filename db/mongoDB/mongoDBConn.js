var mongodb = require('mongodb');

var server = new mongodb.Server("127.0.0.1", 27017, {});
var db = new mongodb.Db('merchantDemo', server, {w: 1});

var collection;
db.open(function (error, client) {
    //export the client and maybe some collections as a shortcut
    if ( !error ) {
        console.log('connected to db');
    }
    collection = db.collection("merchantDemo");
});

var updateMerchants = function(portal, merchants, callback) {
	if (collection === undefined) {
		setTimeout(updateMerchants,500,portal,merchants,callback);
	} else {
		collection.bulkWrite(
				[{deleteMany: {
					filter: {portalKey: portal.portal.key, type: portal.portal.type}
				}},
				{insertMany: merchants} ],
				{ordered:true, w:1},
			callback);		
	}
}

module.exports = {updateMerchants: updateMerchants};