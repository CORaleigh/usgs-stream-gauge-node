const express = require('express');
const app = express();
const http = require('https');
const request = require('request');
const url = 'https://waterservices.usgs.gov/nwis/iv/?format=json&countyCd=37183&parameterCd=00060,00065&siteType=ST&agencyCd=USGS&siteStatus=ALL';

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
