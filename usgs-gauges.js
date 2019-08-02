const express = require('express');
const app = express();
const http = require('https');
const request = require('request');
const url = 'https://waterservices.usgs.gov/nwis/iv/?format=json&countyCd=37183&parameterCd=00065&siteType=ST&agencyCd=USGS&siteStatus=ALL&period=PT96H';
const fsUrl = 'https://services.arcgis.com/v400IkDOw1ad7Yad/arcgis/rest/services/Flood_Gauge_Locations_WFL1/FeatureServer/0/'
const gaugeUrl = 'https://services.arcgis.com/v400IkDOw1ad7Yad/arcgis/rest/services/usgs_gauge_locations/FeatureServer/0/'
const WebSocket = require('ws');
const wss = new WebSocket.Server({port: 3001});
const secret = '';
const clientId = '';
const grantType = 'client_credentials';
const tokenUrl = 'https://www.arcgis.com/sharing/rest/oauth2/token';
function getToken() {
    return new Promise((fulfill, reject) => {
        request.post(tokenUrl, {form: {
            f: 'json',
            client_id: clientId,
	    client_secret: secret,
            grant_type: grantType,
        }}, (error, response, body) => {
            let data = JSON.parse(body);
            if (data.access_token) {
                    fulfill(data.access_token);
            }
        });
    });
}

function getObjectIds (site, url, idField,token) {
    return new Promise((fulfill, reject) => {
        request.post(url + 'query', {form: {
            f: 'json',
            token: token,
            returnIdsOnly: true,
            returnGeometry: false,
            where: idField + " = '" + site.siteID + "'"
        }}, (error, response, body) => {
            let data = JSON.parse(body);
            if (data.objectIds) {
                if (data.objectIds.length > 0) {
                    console.log(data.objectIds);
                    fulfill(data.objectIds);
                }
            }
        });
    });
}

function updateLocations (site,token) {
    getObjectIds(site,fsUrl,"siteID",token).then((objectIds) => {
        let features = [];
        objectIds.forEach((oid) => {
            features.push({attributes: {OBJECTID: oid, currentValue: site.value}});
        });
	console.log('update locations');
         request.post(fsUrl + 'updateFeatures', {form: {
            f: 'json',
	    token: token,
            features: JSON.stringify(features)
        }}, (error, response, body) => {
            console.log(body);
        });       
    })
}

function updateGauges (site,token) {
    getObjectIds(site,gaugeUrl,"site_no_text",token).then((objectIds) => {
        let features = [];
        objectIds.forEach((oid) => {
            features.push({attributes: {OBJECTID: oid, currentValue: site.value}});
        });
	console.log('update gauges');
         request.post(gaugeUrl + 'updateFeatures', {form: {
            f: 'json',
            token: token,
            features: JSON.stringify(features)
        }}, (error, response, body) => {
            console.log(body);
        });
    })
}

wss.on('connection', function connection (ws) {
    ws.on('message', function incoming (message) {
        let site = JSON.parse(message);
        getToken().then((token) => {
        	updateLocations(site,token);
//		updateGauges(site,token);
	});
    });
    ws.send('something');
});

app.get('/waterservices/locations', (req, res) => {
    request(url, (error, response, body) => {
        let results = [];
        
        let data = JSON.parse(body);
        data.value.timeSeries.forEach(function(timeSeries) {
            let newObj = {};
                            //console.log(timeSeries.variable);

           // if (timeSeries.variable.variableCode[0].value === "00065") {
                newObj.siteName = timeSeries.sourceInfo.siteName;
                newObj.siteID = timeSeries.sourceInfo.siteCode[0].value;
                newObj.latitude = timeSeries.sourceInfo.geoLocation.geogLocation.latitude;
                newObj.longitude = timeSeries.sourceInfo.geoLocation.geogLocation.longitude;
                newObj.value = timeSeries.values[0].value[0].value;
                newObj.dateTime = timeSeries.values[0].value[0].dateTime;
                newObj.variableCode = timeSeries.variable.variableCode[0].value;

                results.push(newObj);
            //}

        }, this);
        res.send(results);
    });    
});

app.get('/waterservices', (req, res) => {
    request(url, (error, response, body) => {
        let results = [];
        
        let data = JSON.parse(body);
        data.value.timeSeries.forEach(function(timeSeries) {
            //let newObj = {};
                            //console.log(timeSeries.variable);
              timeSeries.values[0].value.forEach(function(value) {
                let newObj = {};
		newObj.siteName = timeSeries.sourceInfo.siteName;
                newObj.siteID = timeSeries.sourceInfo.siteCode[0].value;
                newObj.latitude = timeSeries.sourceInfo.geoLocation.geogLocation.latitude;
                newObj.longitude = timeSeries.sourceInfo.geoLocation.geogLocation.longitude;
                newObj.value = value.value;
                newObj.dateTime = value.dateTime;
                newObj.variableCode = timeSeries.variable.variableCode[0].value;


                results.push(newObj);

               });
        }, this);
        res.send(results);
    });
});

app.listen(3000, () => {

});
