var async = require('async');
var crontab = require('node-crontab');
var mongodb = require('../db/mongoDB/mongoDBConn.js');
var dynamoBatchWrite = require('../db/DynamoDB/batchWrite.js');
var portals = require('../config/portals.js');
var rwyscron = require('./spookyRemote.js');
var curlScrape = require('./curlScrape.js');
var describeMerchant = require('./describeMerchant');

// cron: <Minute 1-60> <Hour 0-23> <Day_of_the_Month 1-31> <Month_of_the_Year 1-12> <Day_of_the_Week 1-7>
//var jobId = crontab.scheduleJob("* 2 * * *", function(portals){
	async.eachSeries(portals, function(portal, portalDone) {
		// use the waterfall method to go through each step in sequence
		//  otherwise, the portalDone callback will be called before the cURL callback
		async.waterfall(
			[function(callback){
				// the main function that scrapes webpages
         		rwyscron(portal, function(err, data){
        			if (err) { 
        				callback(err,data); 
        			}
        			// For most scrapeTypes, will return an object: {response: {health: {}, merchants: [] } }
        			//   for scrapeType 1, will return a string: 'accessToken'
        			// Pass the data onto the next function
        			callback(null,data);
         		})
             },
             function(spookyResult, callback){
            	// if scrapeType 1, URL-encode the string and pass it to curlScrape
    			if (portal.portal.scrapeType === 1) {
    				var accessToken = encodeURIComponent(spookyResult);
    				var returnCurlData = function(curlErr, curlData){
    					if (curlErr) {
    						callback(curlErr,curlData);
    					}
    					// if the cURL request completes successfully, create a response
    					// object and populate it with the merchant data array
	         			var response = {};
    					console.log('curlData: '+JSON.stringify(curlData));
    					response.merchants = curlData;
    					// pass the response object along to the describeMerchant block
    					callback(null, response);
    				}
    				console.log('cronRemote accessToken urlencoded: '+encodeURIComponent(accessToken));
    				curlScrape(portal, accessToken, returnCurlData);
    			} else {
					// For scrapeType != 1, the spookyResult is a response object
    				//  pass along to the describeMerchant block
    				callback(null,JSON.parse(spookyResult));
    			}
             },
             function(curlResult, callback){
            	 console.log('in curlResult function');
				 console.log('cronRemote response.merchants undefined? '+JSON.stringify(undefined == curlResult.merchants));
            	 // check to make sure the `merchants` key is defined on the curlResult argument
				 //   and that the array length is not zero
				 if ( undefined == curlResult.merchants || curlResult.merchants.length == 0 ) {
            		callback(true,curlResult);
            	 } else {
     				console.log(curlResult.merchants.length+" merchants returned for "
    						+"["+portal.portal.key+","+portal.portal.type+"]");
     				// the merchants array consists of a simple object
     				//   {name: '...', link: '...', reward: '...' }
     				// use portal data to expand the scope and implement custom logic in describeMerchant
     				var merchants = describeMerchant( portal, curlResult.merchants );
     				callback(null, merchants);
            	 }
             },
             function(describeResult, callback){
            	 console.log('in describeResult function');
 				console.log('write results to db');
				// last step per portal: bulk-write results to mongoDB merchants table
				// mongoDB store will only be used for current data
				mongodb.updateMerchants(portal, describeResult, function(err, data){
					if (err) {
						console.log(err);
					}
					console.log(data);
					callback(null, describeResult);
				});
             }],
             function(err, writeMongoResult){
				if (err) {
					console.log('there was an error and portal loop is exiting');
					portalDone();
				}
				//console.log(JSON.stringify(writeMongoResult));
				dynamoBatchWrite(writeMongoResult, 'Merchants', function(err, data){
					if (err) {
						console.log('there was an error writing to dynamo, loop is exiting');
					}
					portalDone();
				});
		});
	}, function(err) {
		console.log('end callback');
		process.exit();
	}
); 
//}, [portals]);
