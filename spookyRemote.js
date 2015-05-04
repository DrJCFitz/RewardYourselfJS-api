try {
    var Spooky = require('spooky');
} catch (e) {
    var Spooky = require('../lib/spooky');
}
var portal_keys = require('./config/portal-keys.js');

var response = {
		'merchants': [],
		'health': { 'jquery': false, 
			'root': false, 
			'name': false, 
			'altName': null, 
			'link': false, 
			'altLink': null, 
			'reward': false, 
			'altReward': null }
};

var config = 
{ child: { 'transport': 'http', 
	'ssl-protocol':'any', 
	'ignore-ssl-errors':'yes' 
		},
  casper: { logLevel: 'debug',
          verbose: true,
          viewportSize: { width: 800, height: 1024 },
          remoteScripts: [ 'https://code.jquery.com/jquery-2.1.3.min.js' ],
          pageSettings: {
              javascriptEnabled: true,
              loadImages: false,
              loadPlugins: false,
              localToRemoteUrlAccessEnabled: false,
              userAgent: "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:37.0) Gecko/20100101 Firefox/37.0",
              userName: null,
              password: null,
              XSSAuditingEnabled: false
        }
  }
}

var	scrape = function(name, link, reward){
	this.name = name;
	this.link = link;
	this.reward = reward;
	return this;
};

var merchant = function( name, link, reward, portal ) {
    this.name = parseName( name, portal );
    this.key = merchantNameToKey( name );
    this.link = portal.portal.baseUrl + link.split(new RegExp('(\\.\\.)?(.+)'))[2];
    this.reward = parseReward( reward, portal );
    this.enabled = true;
    this.portalName = portal.portal.name;
    this.portalKey = portal.portal.key;
    this.type = portal.portal.type;
    this.dateCreated = new Date();
    return this;
}

var reward = function ( value, unit, rate, limit, portal ) {
    this.value = value;
    this.unit = unit;
    this.rate = rate;
    this.limit = limit;
    // use the id for the timestamp in seconds
    this.id = portal.portal.key+parseInt(new Date().getTime()/1000);
    this.equivalentPercentage = portal.portal.equivalentPercentage;
    this.currency = portal.portal.currency;
    return this;
}

var parseName = function( rawName, portal ){
	//debug(rawName);
    if (portal.pageData.name.replace === true ) {
        return rawName.replace(new RegExp(portal.pageData.name.regex), '').trim();
    } else {
        return rawName.trim();
    }
}

var parseReward = function( rawReward, portal ){
    //debug( rawReward );
    //debug(self.variables.merchant.reward.regex);
    var unit, rate, limit, value;
    var matchReward = rawReward.match(new RegExp(portal.pageData.reward.regex));
    if ( null != matchReward ) {
        limit = ( null == matchReward[portal.pageData.reward.limitIndex] ) ? '' : matchReward[portal.pageData.reward.limitIndex];
        if ( null == matchReward[portal.pageData.reward.dollarIndex] ) {
            unit = ( null == matchReward[portal.pageData.reward.unitIndex] ) ? '' : matchReward[portal.pageData.reward.unitIndex];
            rate = ( null == matchReward[portal.pageData.reward.rateIndex] ) ? '' :  matchReward[portal.pageData.reward.rateIndex];
        } else { 
            unit = matchReward[portal.pageData.reward.dollarIndex];
            rate = matchReward[portal.pageData.reward.dollarIndex];
        }
        value = ( null == matchReward[portal.pageData.reward.valueIndex] ) ? 0.0 : parseFloat(matchReward[portal.pageData.reward.valueIndex]);
        return new reward( value, unit, rate, limit, portal );
    } else {
    	return matchReward;
    }
}

var merchantNameToKey = function( merchantName ) {
    // strip any spaces or special characters from name and convert to lowercase
    var keyName = merchantName.replace(/\W+/g,'').replace(/\s+/g,'').toLowerCase().trim();
    if (portal_keys[keyName] === undefined ) {
        return keyName.trim();
    } else {
        return portal_keys[keyName];
    }
}

module.exports = function(portal, callback) {
	
	var singleScrape = function(portal) {
		spooky.start(portal.portal.baseUrl + portal.portal.storePath);
		spooky.then( [{portal:portal, response: response},
		    function(){
				this.emit('process',this.evaluate(function(pageMerchant, response){
					// make sure jQuery is loaded
					response.health.jquery = (jQuery !== undefined);
					if (response.health.jquery) {
						// check the health of other parameters
	            		switch (pageMerchant.portal.scrapeType) {
	            		case 0:
	            			response.health.root = ( jQuery(pageMerchant.portal.rootElement).length > 0 );
	            			if (response.health.root) {
		            			response.health.name = (jQuery(pageMerchant.portal.rootElement).find(pageMerchant.pageData.name.element).length > 0); 
		            			if ( !response.health.name && pageMerchant.pageData.name.altElement !== undefined ) {
		            				response.health.altName = (jQuery(pageMerchant.portal.rootElement).find(pageMerchant.pageData.name.altElement).length > 0);
		            			}
		            			if ( response.health.name ) {
		            				response.health.link = (jQuery(pageMerchant.portal.rootElement).find(pageMerchant.pageData.link.element).length > 0);
			 						response.health.reward = (jQuery(pageMerchant.portal.rootElement).find(pageMerchant.pageData.reward.element).length > 0);
		            			} else if ( pageMerchant.pageData.link.altElement !== undefined &&
		            					pageMerchant.pageData.reward.altElement !== undefined ) {
		            				response.health.altLink = (jQuery(pageMerchant.portal.rootElement).find(pageMerchant.pageData.link.altElement).length > 0);
			 						response.health.altReward = (jQuery(pageMerchant.portal.rootElement).find(pageMerchant.pageData.reward.altElement).length > 0);		            				
		            			}
		            			
		            			if ( (response.health.name && response.health.link && response.health.reward) || 
		            					(response.health.altName && response.health.altLink && response.health.altReward) ) {
		            				jQuery(pageMerchant.portal.rootElement).each(function(index, element){
		                				if (response.health.name) {
		                					response.merchants.push({name: jQuery(element).find(pageMerchant.pageData.name.element).text(), 
		                							link: jQuery(element).find(pageMerchant.pageData.link.element).attr('href'),
		                							reward: jQuery(element).find(pageMerchant.pageData.reward.element).text() } );
		                				} else {
		                					response.merchants.push({ name: jQuery(element).find(pageMerchant.pageData.name.altElement).attr(pageMerchant.pageData.name.altAttr), 
		                							link: jQuery(element).find(pageMerchant.pageData.link.altElement).attr('href'),
		                							reward: jQuery(element).find(pageMerchant.pageData.reward.altElement).text() } );
		                				}
		                			});
		            			}
		            		}
	            			break;
	            		case 1:
	            			var nest = pageMerchant.portal.rootVariable.split('.');
			  		  		var promo = window[nest[0]];
		  		  			var remaining = nest.slice(1);
			  		  		for (param in remaining){
			  		  			promo = promo[remaining[param]];
			  		  		}
	            			response.health.rootElement = ( promo.length > 0 );
	            			
	            			if (response.health.rootElement) {
	            				response.health.name = (promo[0][pageMerchant.pageData.name.element] !== null);
	            				response.health.link = (promo[0][pageMerchant.pageData.link.element] !== null);
	            				response.health.reward = (promo[0][pageMerchant.pageData.reward.element] !== null);
	            			}
	            			
	            			if ( (response.health.name && response.health.link && response.health.reward) || 
		            				 (response.health.altName && response.health.altLink && response.health.altReward) ) {
	            				promo.forEach(function(entry,index){
	            					response.merchants.push( {name: entry[pageMerchant.pageData.name.element],
	            							link: entry[pageMerchant.pageData.link.element],
	            							reward: entry[pageMerchant.pageData.reward.element]} );
	              		  		});
	            			}
	            			break;
		            	}
	            	}

					return JSON.stringify(response);
				},
				{ pageMerchant: portal,
				  response: response }));
	    	}
		]);
		return spooky.run();
	}
	
	var spookyFunction = function (err, res) {
	    if (err) {
	        e = new Error('Failed to initialize SpookyJS');
	        e.details = err;
	        throw e;
	    }

	    // This executes in the Node context
		spooky.on('error', function (e, stack) {
		    console.error(e);
		
		    if (stack) {
		        console.log(stack);
		    }
		});
		
		
		// Uncomment this block to see all of the things Casper has to say.
		// There are a lot.
		// He has opinions.
		spooky.on('console', function (line) {
		    console.log(line);
		});

	   	spooky.on("resource.requested", function(requestData, networkRequest){
			//console.log('Request (#' + requestData.id + '): ' + JSON.stringify(requestData));
			if (requestData.url == 'about:blank') {
    			// this is a redirect url that prevents scraping
    			networkRequest.abort();
			}
	   	});
		
	   	spooky.on('error', function(msg, stacktrace){
			callback(true, "ERROR: "+msg);
		});

		spooky.on("page.error", function(msg, trace) {
		    //callback(true, "ERROR: " + msg 
		    //		+" for ["+portal.portal.key+","+portal.portal.type+"]");
		});

		spooky.on("load.failed", function(object) {
		    callback(true, "ERROR: Load failed");
		});
		
		spooky.on("resource.error", function(resourceError) {
		    callback(true, "Error "+resourceError.errorCode+": "+resourceError.errorString
		    		+ " at URL "+resourceError.url);
		});
		
		spooky.on('process', function (scrapeResult) {
			response = JSON.parse(scrapeResult);
			if (response.merchants.length > 0) {
				response.merchants.forEach(function(merch, index, origArray){
					//console.log(JSON.stringify([origArray[index], origArray[index].name, origArray[index].link, origArray[index].reward]));
					origArray[index] = new merchant( origArray[index].name, origArray[index].link, origArray[index].reward, portal );
				});
				console.log('merchant 0:'+JSON.stringify(response.merchants[0]));
			}
			console.log('processed # merchants:'+response.merchants.length);
		});
		
		spooky.on('run.complete', function(){
			console.log('run complete # merchants:'+response.merchants.length);
			callback(null, JSON.stringify(response));
		});		

		return singleScrape(portal);
	}
	var spooky = new Spooky(config, spookyFunction);
}
