/* jshint node: true */

(function() {
    "use strict";


const fs=require('fs-extra');
const parseString = require('xml2js').parseString, xml2js = require('xml2js');


const os = require('os');

    function setAllureEnvironment() {
        const filename = 'allure-results/environmentTemplate.xml';
        const enviromentFile = 'allure-results/environment.xml';
        fs.readFile(filename, 'utf-8', function (err, xml) {
            if (err) { throw err; }
            parseString(xml, function (err, json) {
                if (err) { throw err; }
                if (json === null) {
                    console.log('xml json is null for ' + filename);
                    return;
                }
                let paramaters = json.environment.parameter;

                paramaters.push({
                    key:'PLATFORM',
                    value:os.platform() +' '+ os.type()
                });
                paramaters.push({
                    key:'HOSTNAME',
                    value:os.hostname()
                });
                var cypressConf = JSON.parse(fs.readFileSync('cypress.json', 'utf8'));
                let baseUrl = process.env.CYPRESS_baseUrl;
                if (baseUrl === undefined) { baseUrl = cypressConf.baseUrl; }
                paramaters.push({
                    key:'baseUrl',
                    value:baseUrl
                });
                let testmode = process.env.TESTMODE;
                if (testmode === undefined) { testmode = cypressConf.testmode; }
                if (testmode === undefined) { testmode = 'desktop'; }
                paramaters.push({
                    key:'TESTMODE',
                    value:testmode
                });
                gitStatus.forEach(function (repoStatus) {
                    paramaters.push({
                        key:repoStatus.repo,
                        value:repoStatus.branch + ' ' + repoStatus.hash
                    });
                });
                // json back to xml.
                var builder = new xml2js.Builder();
                var xml = builder.buildObject(json);

                fs.writeFile(enviromentFile, xml, function (err) {
                    if (err) { throw err; }
                });
            });
        });
    }


    function addAllureEnvironment(newKey,newValue) {
        const filename = 'allure-results/environment.xml';
        const enviromentFile = filename;
        fs.readFile(filename, 'utf-8', function (err, xml) {
            if (err) { throw err; }
            parseString(xml, function (err, json) {
                if (err) { throw err; }
                if (json === null) {
                    console.log('xml json is null for ' + filename);
                    return;
                }
                let paramaters = json.environment.parameter;

                paramaters.push({
                    key:newKey,
                    value:newValue
                });

                // json back to xml.
                var builder = new xml2js.Builder();
                var xml = builder.buildObject(json);

                fs.writeFile(enviromentFile, xml, function (err) {
                    if (err) { throw err; }
                });
            });
        });
    }

    const repos = ['./'];
    const gitStatus = [];
    const child_process = require('child_process');
    repos.forEach(function (repo) {
        let output = child_process.execSync('git -C '+repo+' rev-parse --short HEAD');
        let hash = output.toString().trim();
        output = child_process.execSync('git -C '+repo+' rev-parse --abbrev-ref HEAD');
        let branch = output.toString().trim();
        repo = repo.replace(/^..\//, "");
        gitStatus.push({'repo':repo,'branch':branch,'hash':hash});
    });

    try {
        setAllureEnvironment();
    }
    catch(e) { console.log(e); }


})();
