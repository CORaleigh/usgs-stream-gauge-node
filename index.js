const express = require('express');
const app = express();
const http = require('https');
const request = require('request');
const url = 'https://waterservices.usgs.gov/nwis/iv/?format=json&countyCd=37183&parameterCd=00060,00065&siteType=ST&agencyCd=USGS&siteStatus=ALL';
const fsUrl = 'https://services.arcgis.com/v400IkDOw1ad7Yad/arcgis/rest/services/Flood_Gauge_Locations_WFL1/FeatureServer/0/'
const WebSocket = require('ws');
const wss = new WebSocket.Server({port: 3001});

function getObjectIds (site) {
    return new Promise((fulfill, reject) => {
        request.post(fsUrl + 'query', {form: {
            f: 'json',
            returnIdsOnly: true,
            returnGeometry: false,
            where: "siteID = '" + site.siteID + "'"
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

function updateLocations (site) {
    getObjectIds(site).then((objectIds) => {
        let features = [];
        objectIds.forEach((oid) => {
            features.push({attributes: {OBJECTID: oid, currentValue: site.value}});
        });
         request.post(fsUrl + 'updateFeatures', {form: {
            f: 'json',
            features: JSON.stringify(features)
        }}, (error, response, body) => {
            console.log(body);
        });       
    })
}

wss.on('connection', function connection (ws) {
    ws.on('message', function incoming (message) {
        let site = JSON.parse(message);
        
        updateLocations(site);
    });
    ws.send('something');
});

app.get('/waterservices/locations', (req, res) => {
    request(url, (error, response, body) => {
        let results = [];
        
        let data = JSON.parse(body);
        data.value.timeSeries.forEach(function(timeSeries) {
            let newObj = {};
                            console.log(timeSeries.variable);

            if (timeSeries.variable.variableCode[0].value === "00060") {
                newObj.siteName = timeSeries.sourceInfo.siteName;
                newObj.siteID = timeSeries.sourceInfo.siteCode[0].value;
                newObj.latitude = timeSeries.sourceInfo.geoLocation.geogLocation.latitude;
                newObj.longitude = timeSeries.sourceInfo.geoLocation.geogLocation.longitude;
                newObj.value = timeSeries.values[0].value[0].value;
                newObj.dateTime = timeSeries.values[0].value[0].dateTime;
                newObj.variableCode = timeSeries.variable.variableCode[0].value;

                results.push(newObj);
            }

        }, this);
        res.send(results);
    });    
});

app.get('/waterservices', (req, res) => {
    request(url, (error, response, body) => {
        let results = [];
        
        let data = JSON.parse(body);
        data.value.timeSeries.forEach(function(timeSeries) {
            let newObj = {};
                            console.log(timeSeries.variable);

            if (timeSeries.variable.variableCode[0].value === "00060") {
                newObj.siteName = timeSeries.sourceInfo.siteName;
                newObj.siteID = timeSeries.sourceInfo.siteCode[0].value;
                newObj.latitude = timeSeries.sourceInfo.geoLocation.geogLocation.latitude;
                newObj.longitude = timeSeries.sourceInfo.geoLocation.geogLocation.longitude;
                newObj.value = timeSeries.values[0].value[0].value;
                newObj.dateTime = timeSeries.values[0].value[0].dateTime;
                newObj.variableCode = timeSeries.variable.variableCode[0].value;

                results.push(newObj);
            }

        }, this);
        res.send(results);
    });
});


app.listen(3000, () => {

});
