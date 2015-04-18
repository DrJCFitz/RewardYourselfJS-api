try {
    var Spooky = require('spooky');
} catch (e) {
    var Spooky = require('../lib/spooky');
}
var merchantResult = null;

var config = 
{ child: { transport: 'http', 'ssl-protocol':'any', 'ignore-ssl-errors':'yes' },
  casper: { logLevel: 'debug',
          verbose: true,
          clientScripts: [ './bower_components/jquery/dist/jquery.js',
              './config/portal-keys.js',
              './public/assets/js/pageScrape.js'
            ],
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


module.exports = function(portal, callback) {
	var merchantScrape = function(portal) {
		spooky.start(portal.portal.baseUrl + portal.portal.storePath);
		spooky.then( [{portal:portal},
		    function(){ 
			 this.emit('processedMerchant',
		            this.evaluate(function(pageMerchant){
		                return $(pageMerchant.portal.rootElement).pageScrape({ merchantKeys: keyTrans,
            				portal: pageMerchant.portal,
            				merchant: pageMerchant.pageData }).process();
		            },
		            {pageMerchant: portal})
		        );
	    }]);
		return spooky.run();
	}

	var variableScrape = function(portal) {
		spooky.start(portal.portal.baseUrl + portal.portal.storePath);
		spooky.then([{portal:portal},
		             function(){ 
						this.emit('processedMerchant',
								this.evaluate(function(pageMerchant){
									$ps = $.fn.pageScrape({ merchantKeys: keyTrans,
			            				portal: pageMerchant.portal,
			            				merchant: pageMerchant.pageData });
									var merchants = [];
									var nest = pageMerchant.portal.rootVariable.split('.');
					  		  		var promo = window[nest[0]];
				  		            var evalstring = 'window'+"['"+nest[0]+"']";
				  		            var remaining = nest.slice(1);
					  		  		for (param in remaining){
					  		  			promo = promo[remaining[param]];
					  		  		}
					  		  		promo.forEach(function(entry,index){
					  		  			var name = $ps.parseName(entry[pageMerchant.pageData.name.element]);
					  		  			var key = $ps.merchantNameToKey(name);
					  		  			var link = entry[pageMerchant.pageData.link.element];
					  		  			var reward = $ps.parseReward(entry[pageMerchant.pageData.reward.element]);
					  		  			if ( reward !== null ) {
					  		                  merchants.push( new $ps.merchant(name, key, link, reward) );
					  		            }
					  		  		});
					  		  		return JSON.stringify(merchants);
					            },
					            {pageMerchant: portal})
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
		
		spooky.on('processedMerchant', function (result) {
			merchantResult = result;
		});
		
		switch (portal.portal.scrapeType) {
			case 0:
				return merchantScrape(portal);
				break;
			case 1:
				console.log('heading to variableScrape');
				return variableScrape(portal);
				break;
		}
	}
	var spooky = new Spooky(config, spookyFunction);
}