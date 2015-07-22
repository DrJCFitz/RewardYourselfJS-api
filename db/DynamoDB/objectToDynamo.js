var objectToDynamo = function(inputObject) {
	var dynOut = {};
	Object.keys(inputObject).forEach(function(key){
		if ( (typeof(inputObject[key]) !== 'string') ||
				(typeof(inputObject[key]) === 'string' && inputObject[key]) ) {
			dynOut[key] = describeProperty(inputObject[key]);			
		}
	});
	return dynOut;
}
var describeProperty = function(inputProperty) {
	switch (typeof inputProperty) {
	case 'number':
		return {"N":inputProperty.toString()};
		break;
	case 'string':
		return {"S":inputProperty};
		break;
	case 'object':
		return {"M":objectToDynamo(inputProperty)};
		break;
	}
}
module.exports = objectToDynamo;