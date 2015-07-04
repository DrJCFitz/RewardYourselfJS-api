try {
    var Spooky = require('spooky');
} catch (e) {
    var Spooky = require('../lib/spooky');
}
var portal_keys = require('./config/portal-keys.js');
var credentials = require('./config/credentials.js');

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
    this.portalTS = portal.portal.key+parseInt(new Date().getTime()/1000);
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
	var config = 
	{ child: { 'transport': 'http', 
		'ssl-protocol':'any', 
		'ignore-ssl-errors':'yes' 
			},
	  casper: { logLevel: 'debug',
	          verbose: true,
	          viewportSize: { width: 800, height: 1024 },
	          remoteScripts: [ ],
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

	var response = {
			'merchants': [],
			'health': { 'jquery': false, 
				'root': false, 
				'name': false, 
				'link': false, 
				'reward': false }
	};

	if (portal.portal.loadJquery) {
		config.casper.remoteScripts.push('https://code.jquery.com/jquery-2.1.3.min.js');
	}
	
	var authenticate = function() {
		spooky.then(function(){
			if ( !this.exists(portal.portal.logoutLinkSelector) && 
					!this.exists(portal.auth.formSelector) ) {
				this.echo('logout link does not exist, clicking login link');
				this.click(portal.portal.loginLinkSelector);
			}
		});
		spooky.then(function(){
			if ( !this.exists(portal.portal.logoutLinkSelector) ) {
				this.waitForSelector(portal.auth.formSelector,
						function(){
							this.echo('filling login page');
							this.fillSelectors(portal.auth.formSelector, credentials[portal.portal.key], portal.auth.submitForm );
						},
						function(){
							this.echo('form did not load');
						},
						portal.portal.waitTimeout
				);
			}
		});
		spooky.then(function(){
			this.capture('filledAuth.png');
		});
	/*	casper.then(function(){
			this.echo('logoutLink exists? '+this.exists(portal.portal.logoutLinkSelector));
			if ( !this.exists(portal.portal.logoutLinkSelector) && !portal.auth.submitForm ) {
				this.echo('clicking form submit');
				this.click(portal.auth.submitSelector);
			}
		});
		*/
	}
	
	var navToAllStores = function(){
		// this can be a link from the base url or a selector for pagination
		if (portal.portal.allStoreSelector !== undefined) {
			spooky.then([{portal:portal},function(){
				this.emit('console','clicking all stores link');
				this.waitForSelector(portal.portal.allStoreSelector,
						function(){
							this.click(portal.portal.allStoreSelector);
						},
						function(){
							this.emit('console','no all stores link');
						},
						portal.portal.waitTimeout);				
			}]);
		} else {
			spooky.then([{portal:portal},function(){
				this.emit('console','opening all stores page');
				this.thenOpen(portal.portal.baseUrl + portal.portal.storePath);				
			}]);
		}
	}

	var scrapeMerchantData = function() {
		spooky.then([{portal:portal, response: response},
 		    function() {
				this.emit('count',JSON.stringify(this.evaluate(function(portal){
					return jQuery(portal.portal.rootElement).find(portal.pageData.name.element).length;
				},{portal: portal})));
				var firstName = this.evaluate(function(portal){
					return jQuery(portal.portal.rootElement).find(portal.pageData.name.element).eq(0).text();
				},{portal: portal});
				this.emit('console','waited for root element; first merchant is '+firstName); 		    	
 		    }
	    ]);

		spooky.then([{portal:portal, response: response},
 		    function(){
 				this.emit('health',
					this.evaluate(
						function(pageMerchant, response){
							response.health.jquery = (jQuery !== undefined);
							if (response.health.jquery) {
			        			response.health.root = ( jQuery(pageMerchant.portal.rootElement).length > 0 );
			        			if (response.health.root) {
			            			response.health.name = (jQuery(pageMerchant.portal.rootElement).find(pageMerchant.pageData.name.element).length > 0); 
			            			if ( response.health.name ) {
			            				var halfCount = parseInt(jQuery(pageMerchant.portal.rootElement).find(pageMerchant.pageData.name.element).length / 2);
			            				response.health.link = (jQuery(pageMerchant.portal.rootElement).find(pageMerchant.pageData.link.element).length > 0);
				 						response.health.reward = (jQuery(pageMerchant.portal.rootElement).find(pageMerchant.pageData.reward.element).length > 0);
				 						
				 						// Make sure the text is not blank; Sample elements in the middle of the page to avoid edge effects
				 						response.health.name = jQuery(pageMerchant.portal.rootElement).find(pageMerchant.pageData.name.element).eq(halfCount).text() !== '';
				 						response.health.link = jQuery(pageMerchant.portal.rootElement).find(pageMerchant.pageData.link.element).eq(halfCount).text() !== '';
				 						response.health.reward = jQuery(pageMerchant.portal.rootElement).find(pageMerchant.pageData.reward.element).eq(halfCount).text() !== '';
			            			}        			
			            		}
							}
							return JSON.stringify(response);
						},
						{ pageMerchant: portal,
						  response: response }
					)
				);
 		    }
	    ]);

		spooky.then([
		    {portal:portal, response: response},
		    function(){
				this.emit('processed',this.evaluate(function(pageMerchant, response){
					var merchants = [];
        			jQuery(pageMerchant.portal.rootElement).each(function(index, element){
    					var name, link, reward;
    					var name = jQuery(element).find(pageMerchant.pageData.name.element).text().trim();
        				if ( name !== '') {
        					link = jQuery(element).find(pageMerchant.pageData.link.element).attr('href');
        					reward = jQuery(element).find(pageMerchant.pageData.reward.element).text().trim();
            				if (pageMerchant.pageData.reward.replace !== undefined) {
            					reward = reward.replace(new RegExp(pageMerchant.pageData.reward.replace),'').trim();
            				}
            				merchants.push({name: name, link:link, reward:reward});
        				}
        			});
        			return merchants;
				},
				{ pageMerchant: portal,
				  response: response }
				));
		}]);
	}

	var count = 0;
	var i=0;

	var openPageAndScrape = function(){
/*
		spooky.then(function(){
			this.capture('scrapeData.png');
		});
*/
		spooky.then([{portal:portal, response:response, count:count, i:i},
             function(){
			// this can be written as it should be executed in the page context
			var checkHealth = function(portal, response){
				response.health.jquery = (jQuery !== undefined);
				if (response.health.jquery) {
        			response.health.root = ( jQuery(portal.portal.rootElement).length > 0 );
        			if (response.health.root) {
            			response.health.name = (jQuery(portal.portal.rootElement).find(portal.pageData.name.element).length > 0); 
            			if ( response.health.name ) {
            				var halfCount = parseInt(jQuery(portal.portal.rootElement).find(portal.pageData.name.element).length / 2);
            				response.health.link = (jQuery(portal.portal.rootElement).find(portal.pageData.link.element).length > 0);
	 						response.health.reward = (jQuery(portal.portal.rootElement).find(portal.pageData.reward.element).length > 0);
	 						
	 						// Make sure the text is not blank; Sample elements in the middle of the page to avoid edge effects
	 						response.health.name = jQuery(portal.portal.rootElement).find(portal.pageData.name.element).eq(halfCount).text() !== '';
	 						response.health.link = jQuery(portal.portal.rootElement).find(portal.pageData.link.element).eq(halfCount).text() !== '';
	 						response.health.reward = jQuery(portal.portal.rootElement).find(portal.pageData.reward.element).eq(halfCount).text() !== '';
            			}        			
            		}
				}
				return JSON.stringify(response);
			}
			
 		    var scrapeMerchantData = function(portal, response){
 		    	var merchants = [];
    			jQuery(portal.portal.rootElement).each(function(index, element){
					var name, link, reward;
					var name = jQuery(element).find(portal.pageData.name.element).text().trim();
    				if ( name !== '') {
    					link = jQuery(element).find(portal.pageData.link.element).attr('href');
    					reward = jQuery(element).find(portal.pageData.reward.element).text().trim();
        				if (portal.pageData.reward.replace !== undefined) {
        					reward = reward.replace(new RegExp(portal.pageData.reward.replace),'').trim();
        				}
        				merchants.push({name: name, link:link, reward:reward});
    				}
    			});
    			return JSON.stringify(merchants);
			}

			// identify AJAX-loaded pages by defining the loadSelector
			if ( portal.portal.loadSelector !== undefined && this.visible(portal.portal.loadSelector) ) {
				this.emit('console','pagination exists? '+JSON.stringify(this.exists(portal.portal.pagination)));
				this.emit('console','loader visible?'+JSON.stringify(this.visible(portal.portal.loadSelector)));
				this.emit('console','loader exists?'+JSON.stringify(this.exists(portal.portal.loadSelector)));
				// wait while the selector is visible in order to scrape all data loaded on the page
				this.waitWhileVisible(portal.portal.loadSelector,
						function(){ // success function
							// give a read on what page we are on
							this.emit('i',JSON.stringify(i++));
							// scrape the page data
							this.emit('console',this.evaluate(scrapeMerchantData));
						},
						function(){ // timeout function
							this.emit('console','loader wait timed out');
						},
						portal.portal.waitTimeout);
			} else { 
				// the page is not loaded by AJAX; wait for the root element to load
				this.waitForSelector(portal.portal.rootElement,
						function(){ // success function
							//this.emit('i',JSON.stringify(i++));
							// scrape the page data
							this.emit('health', this.evaluate(checkHealth,{portal:portal, response:response}));
							this.emit('processed', this.evaluate(scrapeMerchantData,{portal:portal, response:response}));
						},
						function(){ // timeout function
							this.echo('root element wait timed out');
						},
						portal.portal.waitTimeout); 
			}
		}]);
		spooky.then([{portal:portal, count:count},function(){
			this.emit('console','scrapeType<3?'+JSON.stringify(portal.portal.scrapeType<3));
			if ( portal.portal.scrapeType > 2 ||
					(portal.portal.pagination !== undefined && this.exists(portal.portal.pagination)) ){
				this.emit('console','next button exists?'+JSON.stringify(casper.exists(portal.portal.pagination)));
				this.emit('console','next button visible?'+JSON.stringify(casper.visible(portal.portal.pagination)));
				this.thenClick(portal.portal.pagination);
				this.then(openPageForScrape);
			}		
		}]);
	}
	
	var logoutFromPortal = function() {
		spooky.then([{portal:portal},function(){
			this.emit('console','logoutLink exists? '+JSON.stringify(this.exists(portal.portal.logoutLinkSelector)));
			if ( this.exists(portal.portal.logoutLinkSelector) ){
				this.emit('console',"clicking logoutLink")
				this.click(portal.portal.logoutLinkSelector);		
			}			
		}]);
	}

	var singleScrape = function(portal) {
		if ( portal.portal.requiresAuth !== undefined && portal.portal.requiresAuth ) {
			spooky.start(portal.portal.authUrl, function(){
				authenticate();		
			});
		} else {
			spooky.start(portal.portal.baseUrl);
		}

		spooky.then([{response:response},function(){
			response.health.jquery = this.evaluate(function(response){
				// make sure jQuery is loaded
				return (jQuery !== undefined);
			},{response:response});
		}]);
		navToAllStores();
		openPageAndScrape(scrapeMerchantData);
		if ( portal.portal.logoutLink !== undefined && 
				(portal.portal.requiresAuth !== undefined && portal.portal.requiresAuth) ) {
			logoutFromPortal();
		}
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
			console.log('Request (#' + requestData.id + '): ' + JSON.stringify(requestData));
			if (requestData.url == 'about:blank') {
    			// this is a redirect url that prevents scraping
    			networkRequest.abort();
			}
	   	});
		
	   	spooky.on('error', function(msg, stacktrace){
			callback(true, "ERROR: "+msg);
		});

		spooky.on("page.error", function(msg, trace) {
			console.log("ERROR: " + msg 
		    		+" for ["+portal.portal.key+","+portal.portal.type+"]");
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
		
		spooky.on('health', function (healthResult) {
			console.log('health: '+healthResult);
			response = JSON.parse(healthResult);
			
			// decide whether to continue processing if health is off
			if ( !response.health.jquery || !reponse.health.rootElement ||
					!response.health.name || !response.health.link || !response.health.reward ) {
				callback([999, 'page health fail'],JSON.stringify(response));
			}
		});

		spooky.on('i', function (iResult) {
			console.log('i: '+iResult);
			i = JSON.parse(iResult);
		});

		spooky.on('count', function (countResult) {
			console.log('count: '+countResult);
			count = JSON.parse(countResult);
		});

		// if the response array is unset, use the entire incoming data as response
		// otherwise, append new merchant data to existing response.merchants array
		spooky.on('processed', function (scrapeResult) {
			//console.log('processed: '+scrapeResult);
			scrapedMerchants = JSON.parse(scrapeResult);
			console.log('merchants before `processed` call: '+response.merchants.length);
			console.log('merchants in scrapeResult : '+scrapedMerchants.length);
			
			response.merchants = response.merchants.concat(scrapedMerchants);
			console.log('merchants after `processed` call: '+response.merchants.length);
		});
		
		spooky.on('run.complete', function(){
			console.log('run complete # merchants:'+response.merchants.length);
			if (response.merchants.length > 0) {
				response.merchants.forEach(function(merch, index, origArray){
					//console.log(JSON.stringify([origArray[index], origArray[index].name, origArray[index].link, origArray[index].reward]));
					origArray[index] = new merchant( origArray[index].name, origArray[index].link, origArray[index].reward, portal );
				});
				console.log('merchant 0:'+JSON.stringify(response.merchants[0]));
				callback(null, JSON.stringify(response));
			} else {
				callback([111, 'merchants not found'], JSON.stringify(response));
			}
		});		

		return singleScrape(portal);
	}
	var spooky = new Spooky(config, spookyFunction);
}
