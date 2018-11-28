
const path = require('path'), fs=require('fs'), fse=require('fs-extra');

function deleteFiles(startPath,filter){

    let filesArray = [];
    //console.log('Starting from dir '+startPath+'/');

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
                if (err) throw err;
            });
        }
    }
    return filesArray;
}

deleteFiles('allure-results','-testsuite.xml');
deleteFiles('junitReports','cypress-junit-output.xml');
//  fs.unlink('cypress/reports/CypressTestReport.html', (err) => {
//      if (err) throw err;
// });
