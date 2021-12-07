var requestUtils={
	'getParamValue':function(paramName){		
			let value= (location.search.split(paramName + '=')[1]||'').split('&')[0];
			if (value && value.length > 0){
				return value;
			}
			return null;
		},
	'isIOS':function(){
		return /(iPad|iPhone|iPod)/g.test( navigator.userAgent );
	},
	'isAndroid':function(){
		return /Android/g.test( navigator.userAgent );
	},
	'redirect':function(newUrl){
		document.location = newUrl;
	}
};

var goMap = {
	'config':{
		'containerid': 'gocontainer',		
		'defaults':{
			'lat':51.505,
			'lon':-0.09,
			'zoom':13
			}
	},
	'utils':{
		'getPointFromUrl':function(){
			let point = {};
			point.lat = requestUtils.getParamValue('lat');
			point.lon = requestUtils.getParamValue('lon');
			point.zoom = requestUtils.getParamValue('z');
			return point;
		},
		'isPointComplete':function(point){		
			if (!point.lat || !point.lon){
				return false;
			}
			return true;
		},
		'extendPoint':function(initialPoint, newPoint){
			let point={};
			point.lat=newPoint.lat;
			if (!point.lat || point.lat == null){
				point.lat = initialPoint.lat;
			}
			point.lon=newPoint.lon;
			if (!point.lon || point.lon == null){
				point.lon = initialPoint.lon;
			}
			point.zoom=newPoint.zoom;
			if (!point.zoom || point.zoom == null){
				point.zoom = initialPoint.zoom;
			}
			return point;
		}
	},
	'init': function(config){
		if (config && typeof (config) == 'object') {
            $.extend(goMap.config, config);
        }
		goMap.$container = $('#' + goMap.config.containerid);
		goMap.$footer = goMap.$container.find('.gofooter');
		goMap.$latitude = goMap.$container.find('.latitude');
		goMap.$longitude = goMap.$container.find('.longitude');
		
		let inputPoint = goMap.utils.getPointFromUrl();					
		goMap.point = goMap.utils.extendPoint(goMap.config.defaults, inputPoint);
		goMap.refreshCoordinates();
		
		goMap.map =$.mapwidget();		
		goMap.map.showPoint(goMap.point);
		goMap.map.addSlider("slider");
		
		let inputComplete = goMap.utils.isPointComplete(inputPoint);
		if (inputComplete){
			goMap.map.addMarker(goMap.point);
		}
		goMap.point = goMap.utils.getPointFromUrl();	
	},	
	'refreshCoordinates':function(){
		goMap.$latitude.text(goMap.point.lat);
		goMap.$longitude.text(goMap.point.lon);
	}
};

(function($) {
	$.mapwidget = function(config) {
		var loc = goMap.point.lat + '/' + goMap.point.lon;
		var lparams = '?mlat='+goMap.point.lat + '&mlon=' + goMap.point.lon;
		let controlLayer;
		var mapobj={
			config: $.extend({
				'mapid':'map',
                'maxzoom':20,
				'maxnativezoom':19,
				'sourceurl':'https://tile.osmand.net/hd/{z}/{x}/{y}.png',
				'attribution':'&copy; <a href="https://www.openstreetmap.org/'+lparams+'#map=15/'+loc+'">OpenStreetMap</a> contributors'
            }, config),
			init:function(){
				mapobj.map = L.map(mapobj.config.mapid);

				L.Control.Layers.include({
					getActiveOverlays: function () {
						var active = [];
						this._layers.forEach(function (obj) {
							if (obj.overlay && mapobj.map.hasLayer(obj.layer)) {
								active.push(obj.layer);
							}
						});
						return active;
					}
				});

				let bMaps = L.tileLayer(mapobj.config.sourceurl, {
					attribution: mapobj.config.attribution,
					maxZoom: mapobj.config.maxzoom,
					maxNativeZoom: mapobj.config.maxnativezoom
				});

				let clouds = L.tileLayer('/tiles/cloud_cover_f001/{z}/{x}/{y}.png', {
					attribution: mapobj.config.attribution,
					maxZoom: mapobj.config.maxzoom,
					maxNativeZoom: mapobj.config.maxnativezoom,
				});

				let rain = L.tileLayer('/tiles/percipitation_f001/{z}/{x}/{y}.png', {
						attribution: mapobj.config.attribution,
						maxZoom: mapobj.config.maxzoom,
						maxNativeZoom: mapobj.config.maxnativezoom,
					});
				let wind = L.tileLayer('http://tile.memomaps.de/tilegen/{z}/{x}/{y}.png', {
					attribution: mapobj.config.attribution,
					maxZoom: mapobj.config.maxzoom,
					maxNativeZoom: mapobj.config.maxnativezoom,
				});
				let pressure = L.tileLayer('https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png', {
					attribution: mapobj.config.attribution,
					maxZoom: mapobj.config.maxzoom,
					maxNativeZoom: mapobj.config.maxnativezoom,
				});

				let overlayMaps = {
					"Clouds": clouds,
					"Rain": rain,
					"Wind": wind,
					"Pressure": pressure
				};

				controlLayer = new L.Control.Layers(null, overlayMaps);
				controlLayer.addTo(mapobj.map);
				bMaps.addTo(mapobj.map);


			},
			showPoint:function(point){
				mapobj.map.setView([point.lat, point.lon], point.zoom);				
			},
			addMarker:function(point){
				L.marker([point.lat, point.lon]).addTo(mapobj.map);
			},
			addSlider:function(id) {
				$( "#" + id ).slider({
					range: "max",
					min: 0,
					max: 24,
					value: 1,
					slide: function( event, ui ) {
						let activeLayers = controlLayer.getActiveOverlays();
						activeLayers.forEach(l => {
							let url = l._url;
							let layerName = url.match(/tiles\/(.+?)_f/)[1];
							l.setUrl('/tiles/' + layerName + '_f00' + ui.value + '/{z}/{x}/{y}.png')
						});
						$( "#time" ).val( ui.value );
					}
				});
			}
		};
		mapobj.init();
		return {            
            showPoint: mapobj.showPoint,
            addMarker: mapobj.addMarker,
			addSlider: mapobj.addSlider
        };
	};
})(jQuery);

(function($) {
	$.timer=function(config){
		var timerobj={
			config: $.extend({
				'timeoutInMs':300,
                'maxActionDelayInMs':2000,
				'action':function(){},
				'actionparams':null
            }, config),
			init:function(){
				timerobj.timer = null;
				timerobj.startDate = null;
			},
			start:function(){
				timerobj.cancel();
				timerobj.startDate = new Date();
				timerobj.timer=setTimeout(timerobj.onTimer, timerobj.config.timeoutInMs);
			},
			cancel:function(){
				if (timerobj.timer != null){
					clearTimeout(timerobj.timer);
					timerobj.timer = null;
					timerobj.startDate = null;
				}
			},
			onTimer:function(){
				timerobj.timer= null;
				let now = new Date();
				if(now - timerobj.startDate < timerobj.config.maxActionDelayInMs){
					timerobj.config.action(timerobj.config.actionparams);
				}				
			}
		};
		timerobj.init();
		return {
			start:timerobj.start,
			cancel:timerobj.cancel
		};
	};
})(jQuery);

var iosAppRedirect = {
	config:{
		appPrefix:'osmandmaps://',
		containerid:'gocontainer',
		cookieName:'OsmAndInstalled',
		cookieNoExpirationTimeoutInDays:30
	},
	init:function(config){
		if (config && typeof (config) == 'object') {
            $.extend(iosAppRedirect.config, config);
        }
		
		if (!requestUtils.isIOS()){	
			return;
		}
		iosAppRedirect.$container = $('#' + iosAppRedirect.config.containerid);
		iosAppRedirect.$overlay = iosAppRedirect.$container.find('.overlay');
		iosAppRedirect.$popup = iosAppRedirect.$container.find('.ios-popup');
		iosAppRedirect.$yesBtn =  iosAppRedirect.$container.find('.yes');
		iosAppRedirect.$noBtn =  iosAppRedirect.$container.find('.no');
		iosAppRedirect.$cancelBtn =  iosAppRedirect.$container.find('.cancel');
		iosAppRedirect.applestorelink = iosAppRedirect.$container.find('.gobadges .apple a').attr('href');	
		iosAppRedirect.applink = iosAppRedirect.config.appPrefix + document.location.search;	
		
				
		if (iosAppRedirect.isAppInstalled() === "yes"){			
			iosAppRedirect.redirectToApp();			
			return;
		}
		if (iosAppRedirect.isAppInstalled() === "no"){
			return;
		}
		
		iosAppRedirect.$yesBtn.on('click', function(){		    
			iosAppRedirect.redirectToApp();
			iosAppRedirect.closePopup();
		});
		
		iosAppRedirect.$noBtn.on('click', function(){
			iosAppRedirect.setCookie(true);
			iosAppRedirect.closePopup();
			window.open(iosAppRedirect.applestorelink , '_blank');
		});
		
		iosAppRedirect.$cancelBtn.on('click', function(){
			iosAppRedirect.setCookie(false);
			iosAppRedirect.closePopup();			
		});
		iosAppRedirect.openPopup();
	},
	isAppInstalled:function(){
		return Cookies.get('OsmAndInstalled');		
	},
	redirectToApp:function(){
		iosAppRedirect.timer = $.timer({action:iosAppRedirect.clearCookie});
		iosAppRedirect.timer.start();
		requestUtils.redirect(iosAppRedirect.applink);
	},
	setCookie:function(appInstalled){
		if (appInstalled === true){
			Cookies.set(iosAppRedirect.config.cookieName, "yes");
		}else{
			Cookies.set(iosAppRedirect.config.cookieName, "no", { expires: iosAppRedirect.config.cookieNoExpirationTimeoutInDays });
		}
	},	
	clearCookie:function(){
		Cookies.remove('OsmAndInstalled'); 
	},
	openPopup:function(){
		iosAppRedirect.$overlay.show();
		iosAppRedirect.$popup.show();
	},
	closePopup:function(){
		iosAppRedirect.$overlay.hide();
		iosAppRedirect.$popup.hide();
	}
};

var androidAppRedirect = {
	config:{
		appPrefix:'geo:',
		containerid:'gocontainer',
		cookieName:'OsmAndInstalled',
		cookieNoExpirationTimeoutInDays:30
	},
	init:function(config){
		if (config && typeof (config) == 'object') {
            $.extend(androidAppRedirect.config, config);
        }

		if (!requestUtils.isAndroid()){
			return;
		}
		androidAppRedirect.$container = $('#' + androidAppRedirect.config.containerid);
		androidAppRedirect.$overlay = androidAppRedirect.$container.find('.overlay');
		androidAppRedirect.$popup = androidAppRedirect.$container.find('.android-popup');
		androidAppRedirect.$yesBtn =  androidAppRedirect.$container.find('.yes');
		androidAppRedirect.$noBtn =  androidAppRedirect.$container.find('.no');
		androidAppRedirect.$cancelBtn =  androidAppRedirect.$container.find('.cancel');
		androidAppRedirect.applestorelink = androidAppRedirect.$container.find('.gobadges .google a').attr('href');
		androidAppRedirect.applink = androidAppRedirect.config.appPrefix + goMap.point.lat + ',' + goMap.point.lon;


		if (androidAppRedirect.isAppInstalled() === "yes"){
			androidAppRedirect.redirectToApp();
			return;
		}
		if (androidAppRedirect.isAppInstalled() === "no"){
			return;
		}

		androidAppRedirect.$yesBtn.on('click', function(){
			androidAppRedirect.redirectToApp();
			androidAppRedirect.closePopup();
		});

		androidAppRedirect.$noBtn.on('click', function(){
			androidAppRedirect.setCookie(true);
			androidAppRedirect.closePopup();
			window.open(androidAppRedirect.applestorelink , '_blank');
		});

		androidAppRedirect.$cancelBtn.on('click', function(){
			androidAppRedirect.setCookie(false);
			androidAppRedirect.closePopup();
		});
		androidAppRedirect.openPopup();
	},
	isAppInstalled:function(){
		return Cookies.get('OsmAndInstalled');
	},
	redirectToApp:function(){
		androidAppRedirect.timer = $.timer({action:androidAppRedirect.clearCookie});
		androidAppRedirect.timer.start();
		requestUtils.redirect(androidAppRedirect.applink);
	},
	setCookie:function(appInstalled){
		if (appInstalled === true){
			Cookies.set(androidAppRedirect.config.cookieName, "yes");
		}else{
			Cookies.set(androidAppRedirect.config.cookieName, "no", { expires: androidAppRedirect.config.cookieNoExpirationTimeoutInDays });
		}
	},
	clearCookie:function(){
		Cookies.remove('OsmAndInstalled');
	},
	openPopup:function(){
		androidAppRedirect.$overlay.show();
		androidAppRedirect.$popup.show();
	},
	closePopup:function(){
		androidAppRedirect.$overlay.hide();
		androidAppRedirect.$popup.hide();
	}
};

 $( document ).ready(function() {
    goMap.init();
	iosAppRedirect.init();
	androidAppRedirect.init();
  });
