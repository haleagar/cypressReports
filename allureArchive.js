/* jshint node: true */

(function() {
    "use strict";

let today = new Date();
let dd = today.getDate();
let mm = today.getMonth()+1; //January is 0!
let time = '-'+today.getHours() +'-'+ today.getMinutes() +'-'+ today.getSeconds();

let yyyy = today.getFullYear();
if(dd<10){
    dd='0'+dd;
}
if(mm<10){
    mm='0'+mm;
}

const path = require('path'), fs=require('fs-extra'), fse=require('fs-extra');
const parseString = require('xml2js').parseString, xml2js = require('xml2js');
const klawSync = require('klaw-sync');
const sanitize = require("sanitize-filename");
const _ = require("lodash");
const maxFileNameLength = 220;
const RUNNABLE_SEPARATOR = " -- ";
const pathSeparatorRe = /[\\\/]/g;
const invalidCharsRe = /[^0-9a-zA-Z-_\s\(\)]/g;

function deleteFiles(startPath,filter){

    let filesArray = [];
    if (!fs.existsSync(startPath)){
        console.log("no dir ",startPath);
        return;
    }

    const files=fs.readdirSync(startPath);
    for(let i=0;i<files.length;i++){
        let filename=path.join(startPath,files[i]);
        let stat = fs.lstatSync(filename);
        if (stat.isDirectory()){
            //deleteFiles(filename,filter); //recurse
        }
        else if (filename.indexOf(filter)>=0) {
            filesArray.push(filename);
            fs.unlink(filename, (err) => {
                if (err) { throw err; }
            });
        }
    }
    return filesArray;
}
    function getAllureHistory() {
        //todo download history from a public server
        // for now use local history from last run if it exists
        if (fs.existsSync('allure-report/history')) {
            fse.copy('allure-report/history', 'allure-results/history', (err) => {
                if (err) { console.log(err); }
            });
        }
    }


    function preproccessAllureXML() {
        // loop each src/allure-results/*-testsuite.xml
        const files = fs.readdirSync('allure-results');
        for (let i = 0; i < files.length; i++) {
            let filename = path.join('allure-results', files[i]);
            let stat = fs.lstatSync(filename);
            // read file, parse xml, add data, and write update
            if (!stat.isDirectory() &&filename.indexOf('testsuite.xml') >= 0) {
                fs.readFile(filename, 'utf-8', function (err, xml) {
                    if (err) { throw err; }
                    parseString(xml, function (err, json) {
                        if (err) { throw err; }
                        if (json === null) {
                            console.log('xml json is null for ' + filename);
                            fs.unlink(filename, (err) => {
                                if (err) { throw err; }
                            });
                            return;
                        }

                        let testSuiteName = json['ns2:test-suite'].name;
                        let baseTestSuiteName = path.basename(testSuiteName.toString());

                        const videoFilterFn = item => {
                            return path.basename(item.path) === baseTestSuiteName + '.mp4' && item.path.includes(path.dirname(testSuiteName.toString()));
                        };
                        let videofiles = [];
                        if (fs.existsSync('cypress/videos')) {
                            videofiles = klawSync('cypress/videos', {traverseAll: true, filter: videoFilterFn});
                        }
                        const screenshotFilterFn = item => {
                            return item.path.includes(baseTestSuiteName) && path.basename(item.path).includes('png');
                        };
                        let screenshotfiles = [];
                        if (fs.existsSync('cypress/screenshots')) {
                            screenshotfiles = klawSync('cypress/screenshots', {
                                traverseAll: true,
                                filter: screenshotFilterFn
                            });
                        }


                        let testCases = json['ns2:test-suite']['test-cases'];
                        // loop each <test-case
                        testCases[0]['test-case'].forEach(function (testCase) {
                            testCase.name = 'Senario: ' + testCase.name;
                            if (testCase.failure) {
                                // put test suite name in message for categories
                                testCase.failure[0].message[0] = testSuiteName +' : '+ testCase.failure[0].message[0];
                            }
                            testCase.labels = {};
                            testCase.parameters = {};
                            testCase.attachments = {};
                            // $ to declare attributes https://github.com/Leonidas-from-XIV/node-xml2js
                            // example if you want label or parameter
                            // TODO add lookup source for related jira ticket
                            // .labels.label = [{$: { name:'issue', value:"CP-123"}}];
                            // testCase.parameters.parameter = [{$: { name:'test param', value:'http://google.com',kind:'argument'}}];
                            if (testCase.failure && testCase.name.includes('expected fail')) {
                                // we can make it pending if we want
                                testCase.$.status = 'pending';
                                testCase.failure[0].message[0] = testCase.failure[0].message[0] + ' : expected fail';
                            }
                            testCase.attachments.attachment = [];
                            // clean title for filename the same way cypress does
                            // see https://github.com/cypress-io/cypress/blob/develop/packages/server/lib/screenshots.coffee
                            let filename = testCase.title.toString();
                            filename.replace(invalidCharsRe, "");
                            filename.replace(pathSeparatorRe, RUNNABLE_SEPARATOR);
                            filename = sanitize(filename);
                            if (filename.length > maxFileNameLength) {
                                filename = _.truncate(filename, {
                                    length: maxFileNameLength,
                                    omission: ''
                                });
                            }
                            screenshotfiles.forEach(function (screenshotFile) {
                                if (screenshotFile.path.includes(filename)) {
                                    const stats = fs.statSync(screenshotFile.path);
                                    testCase.attachments.attachment.push({
                                        $: {
                                            title: 'Screenshot',
                                            source: screenshotFile.path,
                                            type: 'image/png',
                                            size: stats.size
                                        }
                                    });
                                }
                            });

                            videofiles.forEach(function (videoFile) {
                                const stats = fs.statSync(videoFile.path);
                                testCase.attachments.attachment.push({
                                    $: {
                                        title: 'Video',
                                        source: videoFile.path,
                                        type: 'video/mp4',
                                        size: stats.size
                                    }
                                });
                            });
                        });

                        // json back to xml.
                        var builder = new xml2js.Builder();
                        var xml = builder.buildObject(json);

                        fs.writeFile(filename, xml, function (err, data) {
                            if (err) { throw err; }
                        });

                    });
                });
            }
        }
    }

    function runAllureGenerate() {
        const {exec} = require('child_process');
        const proc1 = exec('allure generate --clean');

        proc1.stdout.on('data', data => {
            console.log(`stdout: ${data}`);
        });
        proc1.stderr.on('data', data => {
            console.log(`stderr: ${data}`);
        });
        proc1.on('error', code => {
            console.log(`bleh ${code}`);
        });
        proc1.on('close', code => {
            console.log(`child process 1 exited with code ${code}`);
            let cibuildid = 'local-docker' + yyyy + mm + dd + time;
            console.log('adding report to archive ' + cibuildid);
            fse.copy('allure-report', 'reports-archive/allure-report' + cibuildid, (err) => {
                if (err) { throw err; }
            });
            //deleteFiles('allure-results','-testsuite.xml');
            //todo upload test results to a public server
            const reportRepo = '../../../credmo-e2e-results';
            const reportRepoPublic = reportRepo+'/public';
            if (fs.existsSync(reportRepo)) {
                if (fs.existsSync(reportRepoPublic)) {
                    fse.removeSync(reportRepoPublic);
                }
                fse.copy('allure-report', reportRepoPublic, (err) => {
                    if (err) {
                        throw err;
                    }
                });
            }
        });
    }

    try {
        getAllureHistory();
    }
    catch(e) { console.log(e); }

    try {
        preproccessAllureXML();
    }
    catch(e) { console.log(e); }

    try {
        runAllureGenerate();
    }
    catch(e) { console.log(e); }

})();
