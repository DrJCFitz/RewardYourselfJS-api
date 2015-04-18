;(function( $, window, document ){

    function PageScrape( element, options ) {
        var self = this;
        var $element = $(element);
        var defaults = {
                merchantKeys: null,
                debugMode: true
            };

        
        self.options = $.extend( {}, defaults, options) ;
        self.variables = { merchant: self.options.merchant,
                           portal: self.options.portal
                         };

        function parseName( rawName ){
        	//debug(rawName);
            if (self.variables.merchant.name.replace === true ) {
                return rawName.replace(new RegExp(self.variables.merchant.name.regex), '').trim();
            } else {
                return rawName.trim();
            }
        }

        function parseReward(rawReward){
            //debug( rawReward );
            //debug(self.variables.merchant.reward.regex);
            var unit, rate, limit;
            var matchReward = rawReward.match(new RegExp(self.variables.merchant.reward.regex));
            debug( matchReward );
            if ( matchReward !== null ) {
	            limit = ( matchReward[self.variables.merchant.reward.limitIndex] !== undefined ) ? matchReward[self.variables.merchant.reward.limitIndex] : '';
	            if ( matchReward[self.variables.merchant.reward.dollarIndex] !== undefined ) {
	                unit = matchReward[self.variables.merchant.reward.dollarIndex];
	                rate = matchReward[self.variables.merchant.reward.dollarIndex];
	            } else {
	                unit = (matchReward[self.variables.merchant.reward.unitIndex] !== undefined) ? matchReward[self.variables.merchant.reward.unitIndex] : ''
	                rate = (matchReward[self.variables.merchant.reward.rateIndex] !== undefined) ? matchReward[self.variables.merchant.reward.rateIndex] : ''
	            }
	            value = (matchReward[self.variables.merchant.reward.valueIndex] !== undefined) ? parseFloat(matchReward[self.variables.merchant.reward.valueIndex]) : 0.0;
	            return new reward(value, unit.trim(), rate.trim(), limit.toLowerCase().trim());
            } else {
            	return matchReward;
            }
        }
        
        function process() {
            var merchants = [];
            $.each($element, function (index, merchantRoot) {
                //debug(index);
            	var alt = false;
                var name = $(merchantRoot).find(self.variables.merchant.name.element).text();
                // employ backup option for finding name
                if ( name == '' && self.variables.merchant.name.altElement != undefined){
                	// use alternate element
                	alt = true;
                	name = $(merchantRoot).find(self.variables.merchant.name.altElement).text();
                }
                if ( null === name ) {
                	// in case of ebates, name is embedded in img attribute sometimes
                	if (alt) {
                		name = $(merchantRoot).find(self.variables.merchant.name.altElement+' '+self.variables.merchant.name.attrElement).attr(self.variables.merchant.name.attr);
                	} else {
	                	name = $(merchantRoot).find(self.variables.merchant.name.element+' '+self.variables.merchant.name.attrElement).attr(self.variables.merchant.name.attr);
                	}
                }
                name = parseName( name );
                var key = merchantNameToKey( name );
                if (alt) {
	                var link = $(merchantRoot).find(self.variables.merchant.link.altElement).attr('href');
	                var reward = parseReward( $(merchantRoot).find(self.variables.merchant.reward.altElement).text() );
                } else {
	                var link = $(merchantRoot).find(self.variables.merchant.link.element).attr('href');
	                var reward = parseReward( $(merchantRoot).find(self.variables.merchant.reward.element).text() );		                	
                }
                if ( reward !== null ) {
	                merchants.push( 
	                    new merchant( name,
	                        key,
	                        link,
	                        reward 
	                    )
	                );
                }
            });
            return JSON.stringify( merchants );
        }
      
        function test() {
            return "rewardYourself test";
        }
        
        function merchant( name, key, link, reward ) {
            this.name = name;
            this.key = key;
            this.link = self.variables.portal.baseUrl + link.split(new RegExp('(\\.\\.)?(.+)'))[2];
            this.reward = reward;
            this.enabled = true;
            this.portalName = self.variables.portal.name;
            this.portalKey = self.variables.portal.key;
            this.type = self.options.portal.type;
            this.dateCreated = new Date();

            return this;
        }
        
        function reward( value, unit, rate, limit ) {
            this.value = value;
            this.unit = unit;
            this.rate = rate;
            this.limit = limit;
            // use the id for the timestamp in seconds
            this.id = self.variables.portal.key+parseInt(new Date().getTime()/1000);
            this.equivalentPercentage = self.variables.portal.equivalentPercentage;
            this.currency = self.variables.portal.currency;
            return this;
        }
        
        function merchantNameToKey( merchantName ) {
            // strip any spaces or special characters from name and convert to lowercase
            var keyName = merchantName.replace(/\W+/g,'').replace(/\s+/g,'').toLowerCase();
            if (self.options.merchantKeys[keyName] === undefined ) {
                return keyName;
            } else {
                return self.options.merchantKeys[keyName];
            }
        }
        
        function debug(msg) {
            if (self.options.debugMode === true) { 
                console.log(msg); 
            }
        }
        
        return { process: process,
        		 merchant: merchant,
        		 reward: reward,
        		 parseName: parseName,
        		 merchantNameToKey: merchantNameToKey,
        		 parseReward: parseReward,
        		 test: test 
        	   };
    };

    $.fn.pageScrape = function(options) {
        return new PageScrape(this, options);
    };
    
})( jQuery, window, document );