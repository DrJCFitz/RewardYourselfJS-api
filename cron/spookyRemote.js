try {
    var Spooky = require('spooky');
} catch (e) {
    var Spooky = require('../lib/spooky');
}
var credentials = require('../config/credentials.js');

var accessToken = null;
var paginationContinue = null;

var getPaginationContinue = function() {
	return paginationContinue;
}

module.exports = function(portal, callback) {
	var config = 
	{ child: { 'transport': 'http', 
		'ssl-protocol':'any', 
		'ignore-ssl-errors':'yes'
	  },
	  casper: { logLevel: 'debug',
	          verbose: true,
	          viewportSize: { width: 800, height: 600 },
	          remoteScripts: [ ],
	          pageSettings: {
	              javascriptEnabled: true,
	              loadImages: false,
	              loadPlugins: true,
	              localToRemoteUrlAccessEnabled: false,
	              userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/43.0.2357.130 Chrome/43.0.2357.130 Safari/537.36",
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
	
	var retrieveToken = function() {
		spooky.then([{portal:portal, response: response},
  		    function() {
 				this.emit('token', 
					this.evaluate(
						function(portal){
								return eval(portal.portal.tokenVariable);
						},
						{portal: portal})
				);
			}
		]);
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
			spooky.thenOpen(portal.portal.baseUrl + portal.portal.storePath, function(){
				this.echo('opened baseUrl + storePath');
			});
		}
		spooky.then([{portal:portal},function(){
			if (portal.portal.paginationLimitSelector !== undefined) {
				this.emit('console','clicking paginationLimitSelector');
				this.waitForSelector(portal.portal.paginationLimitSelector,
						function(){
							this.click(portal.portal.paginationLimitSelector);
						},
						function(){
							this.emit('console','no all paginationLimitSelector link');
						},
						5000);								
			}
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
	    					link = jQuery(element).find(portal.pageData.link.element).attr(portal.pageData.link.attr);
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
								this.emit('processed',this.evaluate(scrapeMerchantData,{portal:portal, response:response}));
							},
							function(){ // timeout function
								this.emit('console','loader wait timed out');
							},
							5000);
				} else { 
					// wait for the root element to load
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
							5000); 
				}
			}]);
			spooky.then([{portal:portal, count:count},function(){
				var continuePagination = false;
				if (portal.portal.scrapeType > 2 && portal.portal.pagination !== undefined) {
					this.waitForSelector(portal.portal.pagination,
							function(){
								this.emit('pagination',JSON.stringify(true));
								this.click(portal.portal.pagination);												
							},
							function(){
								this.emit('console', 'waiting for pagination selector: fail');
								this.emit('pagination',JSON.stringify(false));
							},
							5000);
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
			if (portal.portal.authUrl !== undefined) {
				spooky.start(portal.portal.authUrl, function(portal) {
					phantom.cookiesEnabled = true;
					if (portal.cookies !== undefined) {
						portal.cookies.forEach(function(cookie) {
							phantom.addCookie(cookie);
						});
					}
				});
			} else {
				spooky.start(portal.portal.baseUrl, function(portal) {
					phantom.cookiesEnabled = true;
					if (portal.cookies !== undefined) {
						portal.cookies.forEach(function(cookie) {
							phantom.addCookie(cookie);
						});
					}
				});
			}
			
			spooky.then([{portal:portal},function(){
				if ( !this.exists(portal.portal.logoutLinkSelector) && 
						!this.exists(portal.auth.formSelector) ) {
					this.emit('console','logout link does not exist, waiting for login link');
					this.waitForSelector(portal.portal.loginLinkSelector,
						function(){
							this.emit('console','clicking login link');
							this.click(portal.portal.loginLinkSelector);					
						},
						function(){
							this.emit('console','loginLinkSelector has not appeared');							
						},
						5000);
				}
			}]);
//			spooky.then(function(){
//				this.capture('authPage.png');
//			});
			spooky.then([{portal:portal, credentials:credentials},function(){
				this.emit('console','logoutLink exists? '+this.exists(portal.portal.logoutLinkSelector));
//				if ( !this.exists(portal.portal.logoutLinkSelector) ) {
					this.waitForSelector(portal.auth.formSelector,
						function(){
							this.emit('console','filling login page');
							this.emit('console','credentials:'+JSON.stringify(credentials));
							this.fillSelectors(portal.auth.formSelector, 
									credentials[portal.portal.key], 
									portal.auth.submitForm );
						},
						function(){
							this.emit('console','form did not load');
						},
						portal.portal.waitTimeout
					);
//				}
			}]);
//			spooky.then(function(){
//				this.emit('console', 'capturing filled auth page')
//				this.capture('filledAuth.png');
//			});
			spooky.then([{portal:portal},function(){
				this.emit('console','logoutLink exists? '+this.exists(portal.portal.logoutLinkSelector));
				if ( !this.exists(portal.portal.logoutLinkSelector) && 
						(portal.auth.submitForm !== undefined && !portal.auth.submitForm) ) {
					this.emit('console','clicking form submit');
					this.click(portal.auth.submitSelector);
				}
			}]);
		} else {
			spooky.start(portal.portal.baseUrl, function(portal) {
				phantom.cookiesEnabled = true;
				if (portal.cookies !== undefined) {
					portal.cookies.forEach(function(cookie) {
						phantom.addCookie(cookie);
					});
				}
			});
		}
		if (portal.portal.scrapeType === 1) {
			retrieveToken();
		} else {
			navToAllStores();
			openPageAndScrape();
			if (portal.portal.logoutLink !== undefined && (portal.portal.requiresAuth !== undefined && portal.portal.requiresAuth) ) {
				logoutFromPortal();
			}
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
			//callback(true, "ERROR: "+msg);
	   		console.log("ERROR: "+msg);
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
		    //callback(true, "Error "+resourceError.errorCode+": "+resourceError.errorString
		    console.log("ERROR: " + resourceError.errorCode + ": "+resourceError.errorString); 
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

		spooky.on('token', function (token) {
			console.log('token: '+token);
			accessToken = token;
		});
		
		spooky.on('pagination', function (bool) {
			console.log('on.pagination: '+bool);
			paginationContinue = (bool === 'true');
			if (paginationContinue) {
				openPageAndScrape();				
			}
		});

		// if the response array is unset, use the entire incoming data as response
		// otherwise, append new merchant data to existing response.merchants array
		spooky.on('processed', function (scrapeResult) {
			//console.log('processed: '+scrapeResult);
			scrapedMerchants = JSON.parse(scrapeResult);
			console.log('merchants before `processed` call: '+response.merchants.length);
			console.log('merchants in scrapeResult : '+scrapedMerchants.length);
			console.log('first merchant in scrapeResult : '+JSON.stringify(scrapedMerchants[0]));
			
			response.merchants = response.merchants.concat(scrapedMerchants);
			console.log('merchants after `processed` call: '+response.merchants.length);
		});
		
		spooky.on('run.complete', function(){
			console.log('run complete # merchants:'+response.merchants.length);
			if ( portal.portal.scrapeType !== 1 && response.merchants.length > 0) {
				console.log('merchant 0:'+JSON.stringify(response.merchants[0]));
				callback(null, JSON.stringify(response));
			} else if (portal.portal.scrapeType === 1 ) {
				callback(null, accessToken);
			} else {
				callback([111, 'merchants not found'], JSON.stringify(response));
			}
		});		

		return singleScrape(portal);
	}
	var spooky = new Spooky(config, spookyFunction);
}
