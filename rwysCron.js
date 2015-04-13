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
		            	var stores;
		            	switch (pageMerchant.portal.scrapeType) {
		            		case 0:
				                stores = $(pageMerchant.portal.rootElement);
				                break;
		            		default:
		            			stores = $('body');
		            			break;
		            	}
		            	return stores.pageScrape({ merchantKeys: keyTrans,
            				portal: pageMerchant.portal,
            				merchant: pageMerchant.pageData }).process();
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
		
		spooky.on('processedMerchant', function (result) {
			merchantResult = result;
		});
		return merchantScrape(portal);
	}
	var spooky = new Spooky(config, spookyFunction);
}