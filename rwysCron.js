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
		spooky.then(function(){
	       	 this.emit('console','base defined? '+ this.evaluate(function(){
	    		 return jQuery('div.mn_groupsWrap').length;
	    	 }));

	       	 this.waitForSelector('div.mn_groupsWrap',
				function() {
					this.emit('console', 'waited for selector');
				},
				function(){
					this.emit('console', 'selector wait timeout');
					this.capture('timedOut.png');
				},
				100000);
		});
		spooky.then( [{portal:portal},
		    function(){ 
        	 this.emit('console','jquery defined as jquery? '+ this.evaluate(function(){
        		 return (jQuery !== undefined);
        	 }));
        	 this.emit('console','jquery defined as $? '+ this.evaluate(function(){
        		 return ($ !== undefined);
        	 }));
        	 this.emit('console','rootElement defined as? '+ this.evaluate(function(pageMerchant){
        		 return pageMerchant.portal.rootElement;
        	 },{pageMerchant:portal}));
        	 this.emit('console','rootElement defined? '+ this.evaluate(function(pageMerchant){
        		 return jQuery(pageMerchant.portal.rootElement).length;
        	 },{pageMerchant:portal}));

		     this.emit('processedMerchant',
		            this.evaluate(function(pageMerchant){
		                var stores = $(pageMerchant.portal.rootElement)
		                .pageScrape({ merchantKeys: keyTrans,
		                             portal: pageMerchant.portal,
		                                      merchant: pageMerchant.pageData });
		                return stores.process();
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