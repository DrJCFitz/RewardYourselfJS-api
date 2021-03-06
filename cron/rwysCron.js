try {
    var Spooky = require('spooky');
} catch (e) {
    var Spooky = require('../lib/spooky');
}

var config = 
{ child: { 'transport': 'http', 'ssl-protocol':'any', 'ignore-ssl-errors':'yes' },
  casper: { logLevel: 'debug',
          verbose: true,
          clientScripts: [ './bower_components/jquery/dist/jquery.js',
              './config/portal-keys.js',
              './public/assets/js/pageScrape.js'
            ],
          viewportSize: { width: 800, height: 1024 },
          pageSettings: {
              javascriptEnabled: true,
              loadImages: false,
              loadPlugins: false,
              localToRemoteUrlAccessEnabled: false,
              userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/39.0.2171.65 Chrome/39.0.2171.65 Safari/537.36",
              userName: null,
              password: null,
              XSSAuditingEnabled: false
          }
          }
  }


module.exports = function(portal, portal_keys, callback) {
	var merchantResult = {
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

	var merchantScrape = function(portal) {
		spooky.start(portal.portal.baseUrl + portal.portal.storePath);
		spooky.then( [{portal:portal},
		  		    function(){ 
		  			 this.emit('console',
		  		            this.evaluate(function(pageMerchant){
		  		            	return JSON.stringify(jQuery(pageMerchant.portal.rootElement).length);
		  		            },
		  		            {pageMerchant: portal})
	  		        );
  	    }]);
		spooky.then( [{portal:portal},
			  		    function(){ 
			  			 this.emit('console',
			  		            this.evaluate(function(pageMerchant){
					            	return JSON.stringify([jQuery(pageMerchant.portal.rootElement).find(pageMerchant.pageData.name.element).eq(0).text(),
					            	                       jQuery(pageMerchant.portal.rootElement).find(pageMerchant.pageData.link.element).eq(0).attr('href'),
					            	                       jQuery(pageMerchant.portal.rootElement).find(pageMerchant.pageData.reward.element).eq(0).text()]);
			  		            },
			  		            {pageMerchant: portal})
		  		        );
	  	    }]);
		spooky.then( [{portal:portal, merchantResult: merchantResult},
		    function(){ 
			 this.emit('processed',
		            this.evaluate(function(pageMerchant, merchantResult){
		            	jQuery(pageMerchant.portal.rootElement).each(function(index, element){
            				if ( jQuery(element).find(pageMerchant.pageData.name.element).length > 0 ) {
            					merchantResult.merchants.push({name: jQuery(element).find(pageMerchant.pageData.name.element).text(), 
            							link: jQuery(element).find(pageMerchant.pageData.link.element).attr('href'),
            							reward: jQuery(element).find(pageMerchant.pageData.reward.element).text() } );
            				} else {
            					merchantResult.merchants.push({ name: jQuery(element).find(pageMerchant.pageData.name.altElement).attr(pageMerchant.pageData.name.altAttr), 
            							link: jQuery(element).find(pageMerchant.pageData.link.altElement).attr('href'),
            							reward: jQuery(element).find(pageMerchant.pageData.reward.altElement).text() } );
            				}
            			});
		                return JSON.stringify(merchantResult);
		            },
		            {pageMerchant: portal, merchantResult: merchantResult})
		        );
	    }]);
		return spooky.run();
	}

	var variableScrape = function(portal, portal_keys) {
		spooky.start(portal.portal.baseUrl + portal.portal.storePath);
		spooky.then([{portal: portal,
			   		  portal_keys: portal_keys},
		             function(){ 					    
					    var parseName = function( portal, rawName ){
					    	//debug(rawName);
					        if (portal.pageData.name.replace === true ) {
					            return rawName.replace(new RegExp(portal.pageData.name.regex), '').trim();
					        } else {
					            return rawName.trim();
					        }
					    }
			
					    var parseReward = function( portal, rawReward ){
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
						        return {value: value,
						        		unit: unit,
						        		rate: rate,
						        		limit: limit,
								        // use the id for the timestamp in seconds
								        id: portal.portal.key + parseInt(new Date().getTime()/1000),
								        equivalentPercentage: portal.portal.equivalentPercentage,
								        currency: portal.portal.currency };
					        } else {
					        	return matchReward;
					        }
					    }
					    
					    var merchantNameToKey = function( portal, portal_keys, merchantName ) {
					        // strip any spaces or special characters from name and convert to lowercase
					        var keyName = merchantName.replace(/\W+/g,'').replace(/\s+/g,'').toLowerCase();
					        if (portal_keys[keyName] === undefined ) {
					            return keyName;
					        } else {
					            return portal_keys[keyName];
					        }
					    }
					    
					    this.emit('processed',
								this.evaluate(function(pageMerchant, portal_keys, parseName, parseReward, merchantNameToKey){
									var name, key, link, reward,
										merchants = [],
										nest = pageMerchant.portal.rootVariable.split('.');
					  		  		var promo = window[nest[0]],
					  		  			remaining = nest.slice(1);
					  		  		for (param in remaining){
					  		  			promo = promo[remaining[param]];
					  		  		}
									promo.forEach(function(entry,index){
						  		  			name = parseName(pageMerchant, entry[pageMerchant.pageData.name.element]);
						  		  			key = merchantNameToKey(pageMerchant, portal_keys, name);
						  		  			link = entry[pageMerchant.pageData.link.element];
						  		  			if ( null == link) {
												link = pageMerchant.pageData.link.altPath + entry[pageMerchant.pageData.link.altModifier];
											}
											reward = parseReward(pageMerchant, entry[pageMerchant.pageData.reward.element]);
						  		  			if ( reward != null ) {
						  		                  merchants.push( { name: name,
															        key: key,
															        link: pageMerchant.portal.baseUrl + link.split(new RegExp('(\\.\\.)?(.+)'))[2],
															        reward: reward,
															        enabled: true,
															        portalName: pageMerchant.portal.name,
															        portalKey: pageMerchant.portal.key,
															        type: pageMerchant.portal.type,
															        dateCreated: new Date() } );
						  		            }
						  		  		});
					  		  			return JSON.stringify(merchants);
						            },
						            { pageMerchant: portal,
						              portal_keys: portal_keys,
						              parseName: parseName,
						              parseReward: parseReward,
						              merchantNameToKey: merchantNameToKey
						            })
				        );
		}]);
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

		spooky.on('run.complete', function(){
			callback(null, merchantResult);		
		});
		
		spooky.on('error', function(msg, stacktrace){
			callback(msg, stacktrace);
		});
		
		spooky.on('processed', function (result) {
			merchantResult = result;
		});
		
		spooky.on("page.error", function(msg, trace) {
		    console.log("ERROR: " + msg 
		    		+" for ["+portal.portal.key+","+portal.portal.type+"]");
		});

		spooky.on("load.failed", function(object) {
		    callback(true, "ERROR: Load failed");
		});

	   	spooky.on("resource.requested", function(requestData, networkRequest){
    			console.log('Request (#' + requestData.id + '): ' + JSON.stringify(requestData));
    			if (requestData.url == 'about:blank') {
        			// this is a redirect url
        			networkRequest.abort();
			}
		});
		switch (portal.portal.scrapeType) {
			case 0:
				return merchantScrape(portal);
				break;
			case 1:
				console.log('heading to variableScrape');
				return variableScrape(portal, portal_keys);
				break;
		}
	}
	var spooky = new Spooky(config, spookyFunction);
}
