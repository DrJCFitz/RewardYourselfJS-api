curl = require('node-curl');
module.exports = function(portal, token, callback){
	//console.log('curlScrape using '+JSON.stringify([portal.curl.endpoint, portal.curl.queryString, token]));
	var receiveResponse = function(err){
		res = JSON.parse(this.body);
		//console.log('no curlScrape error ? '+JSON.stringify(res[portal.curl.response][portal.curl.error] === undefined));
		if (res[portal.curl.response][portal.curl.error] === undefined) {
			var merchants = [];
			//console.log('length of response: '+JSON.stringify(res[portal.curl.response].length));
			if ( res[portal.curl.response].length > 0 ) {
				res[portal.curl.response].forEach(function(element, index, array){
					merchants.push({name: element[portal.pageData.name.element], 
						link: element[portal.pageData.link.element], 
						reward: element[portal.pageData.reward.element][portal.pageData.reward.elementComponents.value] + 
							' ' + 
							element[portal.pageData.reward.element][portal.pageData.reward.elementComponents.rate]});
				});
			}
			callback(null, merchants);						
		} else {
			callback(res[portal.curl.response][portal.curl.error], res[portal.curl.response]);									
		}
	}
	curl(portal.curl.endpoint+portal.curl.queryString+token,
		receiveResponse);
}
