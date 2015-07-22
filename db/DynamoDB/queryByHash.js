var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB({endpoint:'http://127.0.0.1:8000',region:'us-east-1'});

var queryByHash = function(tableName, hashKey, hashValue, callback) {
	var params = {};
	params.TableName = tableName;
	params.Select = 'ALL_ATTRIBUTES';
	params.KeyConditionExpression = hashKey+' = :value';
	params.ExpressionAttributeValues = {':value': hashValue };

	var queryCallback = function(err, data){
		if (err) {
			//console.log(err);
			callback(err, data);
		} else {
			//console.log('query response: '+JSON.stringify(data));
			callback(null, data);
		}
	}

	docClient.query(params, queryCallback);
	
}
