var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB({region:'us-east-1'});

var params = { RequestItems: { } };

// Iterate over all of the additional URLs and keep kicking off batches of up to 25 items
var batchWrite = function(items, table) {
	table = table || 'Merchants';
	params['RequestItems'][table] = [];
	
	var attempt = 0;
	while (items.length > 0) {

	    // Pull off up to 25 items from the list
	    for (var i = params['RequestItems'].length; i < 25; i++) {

	        // Nothing else to add to the batch if the input list is empty
	        if (items.length === 0) {
	            break;
	        }

	        // Take a URL from the list and add a new PutRequest to the list of requests
	        // targeted at the Image table
	        item = items.pop();
	        params['RequestItems'][table].push({ PutRequest: {Item: objectToDynamo(merch) }});
	    }
	    // Kick off this batch of requests
	    console.log("Calling BatchWriteItem with a new batch of "
	            + params['RequestItems'][table].length + " items");
	    dynamo.batchWriteItem(params, doBatchWriteItem);

	    // Initialize a new blank params variable
	    params['RequestItems'][table] = [];
	}
	
	//A callback that repeatedly calls BatchWriteItem until all of the writes have completed
	function doBatchWriteItem(err, data) {
	    if (err) {
	        console.log(err); // an error occurred
	    } else {
	    	if (('UnprocessedItems' in data) && (table in data.UnprocessedItems)) {
	    		attempt++;
	            // More data. Call again with the unprocessed items.
	            var params = {
	                RequestItems: data.UnprocessedItems
	            };
	            console.log("Calling BatchWriteItem again to retry "
	                + params['RequestItems'][table].length + "UnprocessedItems");
	            setTimeout(function(){
	            		dynamo.batchWriteItem(params, doBatchWriteItem);
	            	},Math.pow(attempt,2)*1000);
	            }
	        } else {
	            console.log("BatchWriteItem processed all items in the batch");
	        }
	    }
	}
}

module.exports = batchWrite;