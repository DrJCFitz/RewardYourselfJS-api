var AWS = require('aws-sdk');
var DOC = require('dynamodb-doc');
var dynamo = new AWS.DynamoDB({region:'us-east-1'});
var docClient = new DOC.DynamoDB(dynamo);

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

module.exports = queryByHash;
